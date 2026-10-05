import { Entity } from '../shared/Entity';

export type AnnouncementCategory =
  | 'GENERAL'
  | 'ACADEMIC'
  | 'FEES'
  | 'EVENT'
  | 'HOLIDAY'
  | 'EMERGENCY'
  | 'SPORTS'
  | 'EXAM';

export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type AnnouncementAudience =
  | 'ALL'
  | 'PARENTS'
  | 'TEACHERS'
  | 'STUDENTS'
  | 'SPECIFIC_GRADE';

export type AnnouncementStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

export interface AnnouncementProps {
  schoolId: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  targetAudience: AnnouncementAudience;
  targetGradeLevel?: string;
  authorName: string;
  authorRole: string;
  authorUserId?: string;
  publishDate: string;
  expiryDate?: string;
  isPinned: boolean;
  status: AnnouncementStatus;
  attachmentName?: string;
  attachmentUrl?: string;
  sendSmsBroadcast?: boolean;
  sendWhatsAppBroadcast?: boolean;
  acknowledgements: string[];
}

export class Announcement extends Entity<AnnouncementProps> {
  public static create(
    props: Partial<AnnouncementProps> & {
      schoolId: string;
      title: string;
      content: string;
      authorName: string;
      authorRole: string;
    },
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): Announcement {
    return new Announcement(
      {
        schoolId: props.schoolId,
        title: props.title,
        content: props.content,
        category: props.category || 'GENERAL',
        priority: props.priority || 'NORMAL',
        targetAudience: props.targetAudience || 'ALL',
        targetGradeLevel: props.targetGradeLevel,
        authorName: props.authorName,
        authorRole: props.authorRole,
        authorUserId: props.authorUserId,
        publishDate: props.publishDate || new Date().toISOString().split('T')[0],
        expiryDate: props.expiryDate,
        isPinned: props.isPinned ?? false,
        status: props.status || 'PUBLISHED',
        attachmentName: props.attachmentName,
        attachmentUrl: props.attachmentUrl,
        sendSmsBroadcast: props.sendSmsBroadcast ?? false,
        sendWhatsAppBroadcast: props.sendWhatsAppBroadcast ?? false,
        acknowledgements: props.acknowledgements || []
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

  public get content(): string {
    return this._props.content;
  }

  public get category(): AnnouncementCategory {
    return this._props.category;
  }

  public get priority(): AnnouncementPriority {
    return this._props.priority;
  }

  public get targetAudience(): AnnouncementAudience {
    return this._props.targetAudience;
  }

  public get targetGradeLevel(): string | undefined {
    return this._props.targetGradeLevel;
  }

  public get authorName(): string {
    return this._props.authorName;
  }

  public get authorRole(): string {
    return this._props.authorRole;
  }

  public get authorUserId(): string | undefined {
    return this._props.authorUserId;
  }

  public get publishDate(): string {
    return this._props.publishDate;
  }

  public get expiryDate(): string | undefined {
    return this._props.expiryDate;
  }

  public get isPinned(): boolean {
    return this._props.isPinned;
  }

  public get status(): AnnouncementStatus {
    return this._props.status;
  }

  public get attachmentName(): string | undefined {
    return this._props.attachmentName;
  }

  public get attachmentUrl(): string | undefined {
    return this._props.attachmentUrl;
  }

  public get sendSmsBroadcast(): boolean | undefined {
    return this._props.sendSmsBroadcast;
  }

  public get sendWhatsAppBroadcast(): boolean | undefined {
    return this._props.sendWhatsAppBroadcast;
  }

  public get acknowledgements(): string[] {
    return [...this._props.acknowledgements];
  }

  public update(props: Partial<Omit<AnnouncementProps, 'schoolId' | 'acknowledgements'>>): void {
    if (props.title !== undefined) this._props.title = props.title;
    if (props.content !== undefined) this._props.content = props.content;
    if (props.category !== undefined) this._props.category = props.category;
    if (props.priority !== undefined) this._props.priority = props.priority;
    if (props.targetAudience !== undefined) this._props.targetAudience = props.targetAudience;
    if (props.targetGradeLevel !== undefined) this._props.targetGradeLevel = props.targetGradeLevel;
    if (props.publishDate !== undefined) this._props.publishDate = props.publishDate;
    if (props.expiryDate !== undefined) this._props.expiryDate = props.expiryDate;
    if (props.isPinned !== undefined) this._props.isPinned = props.isPinned;
    if (props.status !== undefined) this._props.status = props.status;
    if (props.attachmentName !== undefined) this._props.attachmentName = props.attachmentName;
    if (props.attachmentUrl !== undefined) this._props.attachmentUrl = props.attachmentUrl;
    if (props.sendSmsBroadcast !== undefined) this._props.sendSmsBroadcast = props.sendSmsBroadcast;
    if (props.sendWhatsAppBroadcast !== undefined) this._props.sendWhatsAppBroadcast = props.sendWhatsAppBroadcast;
    this._updatedAt = new Date();
  }

  public togglePin(): boolean {
    this._props.isPinned = !this._props.isPinned;
    this._updatedAt = new Date();
    return this._props.isPinned;
  }

  public acknowledge(userId: string): boolean {
    if (!this._props.acknowledgements.includes(userId)) {
      this._props.acknowledgements.push(userId);
      this._updatedAt = new Date();
      return true;
    }
    return false;
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      title: this.title,
      content: this.content,
      category: this.category,
      priority: this.priority,
      targetAudience: this.targetAudience,
      targetGradeLevel: this.targetGradeLevel,
      authorName: this.authorName,
      authorRole: this.authorRole,
      authorUserId: this.authorUserId,
      publishDate: this.publishDate,
      expiryDate: this.expiryDate,
      isPinned: this.isPinned,
      status: this.status,
      attachmentName: this.attachmentName,
      attachmentUrl: this.attachmentUrl,
      sendSmsBroadcast: this.sendSmsBroadcast,
      sendWhatsAppBroadcast: this.sendWhatsAppBroadcast,
      acknowledgements: this.acknowledgements,
      acknowledgementCount: this._props.acknowledgements.length,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
