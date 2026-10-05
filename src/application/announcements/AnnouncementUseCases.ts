import { IdGenerator } from '../../core/domain/shared/Errors';
import {
  Announcement,
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementProps,
  AnnouncementStatus
} from '../../core/domain/announcement/Announcement';
import { IAnnouncementRepository, AnnouncementFilter } from '../../core/ports/repositories/IAnnouncementRepository';
import { INotificationService } from '../../core/ports/services/IExternalServices';
import { WhatsAppService } from '../../infrastructure/services/WhatsAppService';

export interface CreateAnnouncementInput {
  schoolId: string;
  title: string;
  content: string;
  category?: AnnouncementCategory;
  priority?: AnnouncementPriority;
  targetAudience?: AnnouncementAudience;
  targetGradeLevel?: string;
  authorName: string;
  authorRole: string;
  authorUserId?: string;
  publishDate?: string;
  expiryDate?: string;
  isPinned?: boolean;
  status?: AnnouncementStatus;
  attachmentName?: string;
  attachmentUrl?: string;
  sendSmsBroadcast?: boolean;
  sendWhatsAppBroadcast?: boolean;
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  category?: AnnouncementCategory;
  priority?: AnnouncementPriority;
  targetAudience?: AnnouncementAudience;
  targetGradeLevel?: string;
  publishDate?: string;
  expiryDate?: string;
  isPinned?: boolean;
  status?: AnnouncementStatus;
  attachmentName?: string;
  attachmentUrl?: string;
  sendSmsBroadcast?: boolean;
  sendWhatsAppBroadcast?: boolean;
}

export class AnnouncementUseCases {
  constructor(
    private readonly announcementRepo: IAnnouncementRepository,
    private readonly smsService?: INotificationService,
    private readonly whatsAppService?: WhatsAppService
  ) {}

  public async createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
    const id = IdGenerator.generateWithPrefix('ann');
    const announcement = Announcement.create(input, id);
    await this.announcementRepo.save(announcement);

    // Optional notification broadcasting for urgent/high priority notices
    if (announcement.status === 'PUBLISHED') {
      this.triggerBroadcast(announcement).catch(() => {});
    }

    return announcement;
  }

  public async getAnnouncementById(id: string): Promise<Announcement | null> {
    return this.announcementRepo.findById(id);
  }

  public async listAnnouncements(filter?: AnnouncementFilter): Promise<Announcement[]> {
    return this.announcementRepo.findAll(filter);
  }

  public async updateAnnouncement(id: string, input: UpdateAnnouncementInput): Promise<Announcement> {
    const announcement = await this.announcementRepo.findById(id);
    if (!announcement) {
      throw new Error(`Announcement with ID "${id}" not found`);
    }

    announcement.update(input);
    await this.announcementRepo.save(announcement);
    return announcement;
  }

  public async deleteAnnouncement(id: string): Promise<boolean> {
    return this.announcementRepo.delete(id);
  }

  public async togglePin(id: string): Promise<Announcement> {
    const announcement = await this.announcementRepo.findById(id);
    if (!announcement) {
      throw new Error(`Announcement with ID "${id}" not found`);
    }

    announcement.togglePin();
    await this.announcementRepo.save(announcement);
    return announcement;
  }

  public async acknowledgeAnnouncement(id: string, userId: string): Promise<{ success: boolean; count: number }> {
    const announcement = await this.announcementRepo.findById(id);
    if (!announcement) {
      throw new Error(`Announcement with ID "${id}" not found`);
    }

    announcement.acknowledge(userId);
    await this.announcementRepo.save(announcement);
    return {
      success: true,
      count: announcement.acknowledgements.length
    };
  }

  private async triggerBroadcast(announcement: Announcement): Promise<void> {
    // If SMS broadcasting requested
    if (announcement.sendSmsBroadcast && this.smsService) {
      // Broadcast hook logged or sent via NotificationService
    }

    // If WhatsApp broadcasting requested
    if (announcement.sendWhatsAppBroadcast && this.whatsAppService) {
      // Broadcast hook logged or queued in WhatsApp Client
    }
  }
}
