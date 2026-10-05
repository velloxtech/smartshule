import { Announcement } from '../../../core/domain/announcement/Announcement';
import { AnnouncementFilter, IAnnouncementRepository } from '../../../core/ports/repositories/IAnnouncementRepository';

export class InMemoryAnnouncementRepository implements IAnnouncementRepository {
  private announcements: Map<string, Announcement> = new Map();

  constructor() {
    this.seedDefaultAnnouncements();
  }

  private seedDefaultAnnouncements(): void {
    const defaultSchoolId = 'school-1';

    const seedData = [
      {
        id: 'ann-1',
        schoolId: defaultSchoolId,
        title: 'Term 3 Official Opening & General Reporting Guidelines',
        content: `Dear Parents, Guardians, and Teachers,\n\nWe warmly welcome all learners back for Term 3 of the 2026 Academic Year. All learners are expected to report promptly by 7:30 AM in full, clean school uniform.\n\nPlease note:\n1. CBC project materials and stationery should be submitted to the respective class teachers during the first week.\n2. Bus transport routes resume normal morning and evening timings.\n3. The school canteen and hot lunch programme will operate from Day 1.\n\nLet us partner together for a fruitful and enriching term!`,
        category: 'GENERAL' as const,
        priority: 'HIGH' as const,
        targetAudience: 'ALL' as const,
        authorName: 'Rev. Dr. Grace Wanjiku',
        authorRole: 'Head Teacher / Director',
        publishDate: '2026-09-01',
        isPinned: true,
        status: 'PUBLISHED' as const,
        sendSmsBroadcast: true,
        sendWhatsAppBroadcast: true,
        acknowledgements: ['usr-parent-1', 'usr-parent-2']
      },
      {
        id: 'ann-2',
        schoolId: defaultSchoolId,
        title: 'Whole-Year Annual Fee Settlement & Term 3 Clearance',
        content: `Dear Parents and Guardians,\n\nKindly be advised that all approved annual CBC fee schedules for the whole academic year are accessible on the portal.\n\nAll fee remittances should be channeled directly through our official channels:\n- M-Pesa Paybill: 522533\n- Account Number format: 8048859#<Student Name & Grade>\n- Direct Bank Transfer: KCB Bank Kenya (Account #1122334455)\n\nOfficial receipts are automatically generated and reflected on your parent fee statement. For bursary or structured payment plan consultations, our Finance Office remains open Monday to Friday, 8:00 AM - 4:30 PM.`,
        category: 'FEES' as const,
        priority: 'URGENT' as const,
        targetAudience: 'PARENTS' as const,
        authorName: 'Mr. David Mutua',
        authorRole: 'Chief Bursar & Finance Head',
        publishDate: '2026-09-05',
        isPinned: true,
        status: 'PUBLISHED' as const,
        sendSmsBroadcast: true,
        sendWhatsAppBroadcast: true,
        acknowledgements: ['usr-parent-1']
      },
      {
        id: 'ann-3',
        schoolId: defaultSchoolId,
        title: 'Grade 3 & Grade 6 KNEC CBC Assessment & Portfolio Submissions',
        content: `Attention Grade 3 & Grade 6 Parents and Teachers:\n\nThe KNEC Formative Assessment and Learner Portfolios verification window is now open. Teachers are uploading continuous assessments, competency indicators, and project rubrics.\n\nParents are encouraged to review the competency progress updates on the eDiary and ensure all required practical activity kits are brought to school on scheduled dates.`,
        category: 'ACADEMIC' as const,
        priority: 'NORMAL' as const,
        targetAudience: 'PARENTS' as const,
        targetGradeLevel: 'GRADE_3',
        authorName: 'Mrs. Florence Achieng',
        authorRole: 'Deputy Head Teacher (Academics)',
        publishDate: '2026-09-12',
        isPinned: false,
        status: 'PUBLISHED' as const,
        sendSmsBroadcast: false,
        sendWhatsAppBroadcast: true,
        acknowledgements: []
      },
      {
        id: 'ann-4',
        schoolId: defaultSchoolId,
        title: 'Upcoming Mid-Term Break Dates & Transport Adjustments',
        content: `Dear School Community,\n\nPlease take note of the ratified Term 3 mid-term break dates:\n- Break commences: Thursday, 15th October 2026 at 12:30 PM\n- Learners resume: Monday, 19th October 2026 at 7:30 AM\n\nSchool transport buses will drop all learners at their registered pickup stages on Thursday afternoon starting at 12:45 PM. Have a safe and restful mid-term break.`,
        category: 'HOLIDAY' as const,
        priority: 'NORMAL' as const,
        targetAudience: 'ALL' as const,
        authorName: 'Rev. Dr. Grace Wanjiku',
        authorRole: 'Head Teacher / Director',
        publishDate: '2026-09-20',
        isPinned: false,
        status: 'PUBLISHED' as const,
        sendSmsBroadcast: true,
        sendWhatsAppBroadcast: false,
        acknowledgements: []
      },
      {
        id: 'ann-5',
        schoolId: defaultSchoolId,
        title: 'Annual Co-Curricular Sports & Music Festival Gala',
        content: `Dear Parents, Teachers, and Learners,\n\nOur Annual Inter-House Sports Gala and Talent Exhibition is scheduled for Friday, 23rd October 2026 on the main school grounds.\n\nAll houses (Simba, Chui, Ndovu, and Kifaru) will compete in athletics, chess, drama, and traditional music presentations. Parents are warmly invited to attend and cheer on our talented learners! Refreshments will be available.`,
        category: 'EVENT' as const,
        priority: 'NORMAL' as const,
        targetAudience: 'ALL' as const,
        authorName: 'Coach Peter Ombati',
        authorRole: 'Games Master & Co-Curricular Lead',
        publishDate: '2026-09-25',
        isPinned: false,
        status: 'PUBLISHED' as const,
        sendSmsBroadcast: false,
        sendWhatsAppBroadcast: true,
        acknowledgements: []
      },
      {
        id: 'ann-6',
        schoolId: defaultSchoolId,
        title: 'Mandatory Staff Briefing: CBC Competency Assessment Guidelines',
        content: `All Teaching Staff Notice:\n\nThere will be a mandatory professional development briefing this Friday at 3:30 PM in the Staff Conference Room.\n\nAgenda:\n1. Review of KNEC guidelines on portfolio compilation.\n2. Updating digital records of work and scheme submissions.\n3. Term 3 progress reporting timelines.\n\nPlease arrive with your curriculum plan files.`,
        category: 'ACADEMIC' as const,
        priority: 'HIGH' as const,
        targetAudience: 'TEACHERS' as const,
        authorName: 'Mrs. Florence Achieng',
        authorRole: 'Deputy Head Teacher (Academics)',
        publishDate: '2026-09-28',
        isPinned: false,
        status: 'PUBLISHED' as const,
        sendSmsBroadcast: false,
        sendWhatsAppBroadcast: false,
        acknowledgements: []
      }
    ];

    seedData.forEach((data) => {
      const ann = Announcement.create(data, data.id, new Date(data.publishDate), new Date(data.publishDate));
      this.announcements.set(ann.id, ann);
    });
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
