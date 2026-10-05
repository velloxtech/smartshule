import { Announcement } from '../../src/core/domain/announcement/Announcement';
import { InMemoryAnnouncementRepository } from '../../src/infrastructure/database/in-memory/InMemoryAnnouncementRepository';
import { AnnouncementUseCases } from '../../src/application/announcements/AnnouncementUseCases';

describe('Announcement System Domain & UseCases', () => {
  let repo: InMemoryAnnouncementRepository;
  let useCases: AnnouncementUseCases;

  beforeEach(() => {
    repo = new InMemoryAnnouncementRepository();
    useCases = new AnnouncementUseCases(repo);
  });

  describe('Announcement Entity', () => {
    it('should create an announcement with default published status and normal priority', () => {
      const ann = Announcement.create(
        {
          schoolId: 'school-1',
          title: 'Welcome Back Assembly',
          content: 'The first morning assembly starts at 8:00 AM in the main quadrangle.',
          authorName: 'Rev. Dr. Grace Wanjiku',
          authorRole: 'Head Teacher'
        },
        'ann-test-1'
      );

      expect(ann.id).toBe('ann-test-1');
      expect(ann.status).toBe('PUBLISHED');
      expect(ann.priority).toBe('NORMAL');
      expect(ann.category).toBe('GENERAL');
      expect(ann.isPinned).toBe(false);
      expect(ann.acknowledgements).toEqual([]);
    });

    it('should toggle pin status', () => {
      const ann = Announcement.create(
        {
          schoolId: 'school-1',
          title: 'Important Emergency Contact Update',
          content: 'Please update your telephone numbers with the school registry.',
          authorName: 'Admin',
          authorRole: 'ADMIN',
          isPinned: false
        },
        'ann-test-2'
      );

      expect(ann.isPinned).toBe(false);
      const isPinned = ann.togglePin();
      expect(isPinned).toBe(true);
      expect(ann.isPinned).toBe(true);

      const unpinned = ann.togglePin();
      expect(unpinned).toBe(false);
      expect(ann.isPinned).toBe(false);
    });

    it('should track user acknowledgements without duplicates', () => {
      const ann = Announcement.create(
        {
          schoolId: 'school-1',
          title: 'Parent Consent for Educational Field Trip',
          content: 'Please submit signed permission slips before Wednesday.',
          authorName: 'Teacher Jane',
          authorRole: 'TEACHER'
        },
        'ann-test-3'
      );

      expect(ann.acknowledge('usr-parent-10')).toBe(true);
      expect(ann.acknowledgements).toContain('usr-parent-10');
      // Second acknowledgement by same user returns false
      expect(ann.acknowledge('usr-parent-10')).toBe(false);
      expect(ann.acknowledgements.length).toBe(1);
    });
  });

  describe('AnnouncementUseCases', () => {
    it('should create and list announcements', async () => {
      const newAnn = await useCases.createAnnouncement({
        schoolId: 'school-1',
        title: 'New Computer Lab Commissioning',
        content: 'Our state-of-the-art computer lab has been officially opened.',
        category: 'EVENT',
        priority: 'HIGH',
        targetAudience: 'ALL',
        authorName: 'Director',
        authorRole: 'ADMIN'
      });

      expect(newAnn.id).toMatch(/^ann-/);
      expect(newAnn.title).toBe('New Computer Lab Commissioning');

      const all = await useCases.listAnnouncements({ schoolId: 'school-1' });
      expect(all.some((a) => a.id === newAnn.id)).toBe(true);
    });

    it('should filter announcements by audience and category', async () => {
      await useCases.createAnnouncement({
        schoolId: 'school-1',
        title: 'Teachers Only: Moderation Meeting',
        content: 'Meeting in room 4.',
        category: 'ACADEMIC',
        targetAudience: 'TEACHERS',
        authorName: 'Deputy',
        authorRole: 'DEPUTY_HEAD_TEACHER'
      });

      const teacherOnly = await useCases.listAnnouncements({
        schoolId: 'school-1',
        audience: 'TEACHERS'
      });

      expect(teacherOnly.length).toBeGreaterThan(0);
      teacherOnly.forEach((a) => {
        expect(['TEACHERS', 'ALL']).toContain(a.targetAudience);
      });
    });

    it('should update announcement content and priority', async () => {
      const ann = await useCases.createAnnouncement({
        schoolId: 'school-1',
        title: 'Swimming Gala Date Change',
        content: 'Original date: 10th Oct.',
        authorName: 'Coach',
        authorRole: 'TEACHER'
      });

      const updated = await useCases.updateAnnouncement(ann.id, {
        content: 'Rescheduled date: 17th Oct due to weather forecast.',
        priority: 'HIGH'
      });

      expect(updated.content).toBe('Rescheduled date: 17th Oct due to weather forecast.');
      expect(updated.priority).toBe('HIGH');
    });

    it('should toggle pin and reflect in repository', async () => {
      const ann = await useCases.createAnnouncement({
        schoolId: 'school-1',
        title: 'Pinned Urgent Alert',
        content: 'Gate 2 will be closed for maintenance.',
        authorName: 'Security',
        authorRole: 'ADMIN',
        isPinned: false
      });

      const pinned = await useCases.togglePin(ann.id);
      expect(pinned.isPinned).toBe(true);

      const fetched = await useCases.getAnnouncementById(ann.id);
      expect(fetched?.isPinned).toBe(true);
    });
  });
});
