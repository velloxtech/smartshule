import { Announcement } from '../../../core/domain/announcement/Announcement';
import { AnnouncementFilter, IAnnouncementRepository } from '../../../core/ports/repositories/IAnnouncementRepository';

export class InMemoryAnnouncementRepository implements IAnnouncementRepository {
  private announcements: Map<string, Announcement> = new Map();

  constructor() {
    // Blank by default: zero sample/hardcoded notices during application startup
  }

  public async save(announcement: Announcement): Promise<void> {
    this.announcements.set(announcement.id, announcement);
  }

  public async findById(id: string): Promise<Announcement | null> {
    return this.announcements.get(id) || null;
  }

  public async findAll(filter?: AnnouncementFilter): Promise<Announcement[]> {
    let result = Array.from(this.announcements.values());

    if (filter?.schoolId) {
      result = result.filter((a) => a.schoolId === filter.schoolId);
    }

    if (filter?.audience && filter.audience !== 'ALL') {
      result = result.filter((a) => a.targetAudience === filter.audience || a.targetAudience === 'ALL');
    }

    if (filter?.category && filter.category !== 'ALL') {
      result = result.filter((a) => a.category === filter.category);
    }

    if (filter?.priority && filter.priority !== 'ALL') {
      result = result.filter((a) => a.priority === filter.priority);
    }

    if (filter?.status && filter.status !== 'ALL') {
      result = result.filter((a) => a.status === filter.status);
    }

    if (filter?.isPinned !== undefined) {
      result = result.filter((a) => a.isPinned === filter.isPinned);
    }

    if (filter?.gradeLevel) {
      result = result.filter((a) => !a.targetGradeLevel || a.targetGradeLevel === filter.gradeLevel);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.authorName.toLowerCase().includes(q)
      );
    }

    // Sort: Pinned first, then newest publishDate
    return result.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
    });
  }

  public async delete(id: string): Promise<boolean> {
    return this.announcements.delete(id);
  }

  public async count(filter?: AnnouncementFilter): Promise<number> {
    const list = await this.findAll(filter);
    return list.length;
  }
}
