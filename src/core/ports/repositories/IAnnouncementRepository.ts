import { Announcement, AnnouncementAudience, AnnouncementCategory, AnnouncementPriority, AnnouncementStatus } from '../../domain/announcement/Announcement';

export interface AnnouncementFilter {
  schoolId?: string;
  audience?: AnnouncementAudience | string;
  category?: AnnouncementCategory | string;
  priority?: AnnouncementPriority | string;
  status?: AnnouncementStatus | string;
  isPinned?: boolean;
  search?: string;
  gradeLevel?: string;
}

export interface IAnnouncementRepository {
  save(announcement: Announcement): Promise<void>;
  findById(id: string): Promise<Announcement | null>;
  findAll(filter?: AnnouncementFilter): Promise<Announcement[]>;
  delete(id: string): Promise<boolean>;
  count(filter?: AnnouncementFilter): Promise<number>;
}
