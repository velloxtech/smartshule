import {
  IStudentSponsorshipRepository,
  SponsorshipFilterCriteria,
  SponsorshipStats
} from '../../../core/ports/repositories/IStudentSponsorshipRepository';
import {
  StudentSponsorship,
  SponsorshipStatus
} from '../../../core/domain/sponsorship/StudentSponsorship';

export class InMemoryStudentSponsorshipRepository implements IStudentSponsorshipRepository {
  private sponsorships: Map<string, StudentSponsorship> = new Map();

  public async findById(id: string): Promise<StudentSponsorship | null> {
    return this.sponsorships.get(id) || null;
  }

  public async findByStudentId(studentId: string): Promise<StudentSponsorship | null> {
    for (const s of this.sponsorships.values()) {
      if (s.studentId === studentId) {
        return s;
      }
    }
    return null;
  }

  public async findByAdmissionNumber(admissionNumber: string, schoolId?: string): Promise<StudentSponsorship | null> {
    for (const s of this.sponsorships.values()) {
      if (s.admissionNumber.toLowerCase() === admissionNumber.toLowerCase()) {
        if (!schoolId || s.schoolId === schoolId) {
          return s;
        }
      }
    }
    return null;
  }

  public async findAll(filters?: SponsorshipFilterCriteria): Promise<StudentSponsorship[]> {
    let result = Array.from(this.sponsorships.values());

    if (filters?.schoolId) {
      result = result.filter(s => s.schoolId === filters.schoolId);
    }

    if (filters?.studentId) {
      result = result.filter(s => s.studentId === filters.studentId);
    }

    if (filters?.gradeLevel) {
      result = result.filter(s => s.gradeLevel === filters.gradeLevel);
    }

    if (filters?.sponsorshipType) {
      result = result.filter(s => s.sponsorshipType === filters.sponsorshipType);
    }

    if (filters?.sponsorshipStatus) {
      result = result.filter(s => s.sponsorshipStatus === filters.sponsorshipStatus);
    }

    if (filters?.academicYearId) {
      result = result.filter(s => s.academicYearId === filters.academicYearId);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(s =>
        s.studentName.toLowerCase().includes(q) ||
        s.admissionNumber.toLowerCase().includes(q) ||
        s.approvalReference.toLowerCase().includes(q) ||
        s.sponsorName.toLowerCase().includes(q)
      );
    }

    // Sort by latest created/updated
    return result.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  public async save(sponsorship: StudentSponsorship): Promise<void> {
    this.sponsorships.set(sponsorship.id, sponsorship);
  }

  public async update(sponsorship: StudentSponsorship): Promise<void> {
    this.sponsorships.set(sponsorship.id, sponsorship);
  }

  public async delete(id: string): Promise<void> {
    this.sponsorships.delete(id);
  }

  public async getStats(schoolId?: string): Promise<SponsorshipStats> {
    let list = Array.from(this.sponsorships.values());
    if (schoolId) {
      list = list.filter(s => s.schoolId === schoolId);
    }

    const byType: Record<string, number> = {};
    const byGrade: Record<string, number> = {};
    let totalTermlySubsidy = 0;
    let totalAnnualSubsidy = 0;
    let activeCount = 0;
    let suspendedCount = 0;
    let completedCount = 0;
    let lunchCoveredCount = 0;
    let tuitionCoveredCount = 0;

    for (const s of list) {
      byType[s.sponsorshipType] = (byType[s.sponsorshipType] || 0) + 1;
      byGrade[s.gradeLevel] = (byGrade[s.gradeLevel] || 0) + 1;

      if (s.sponsorshipStatus === SponsorshipStatus.ACTIVE) {
        activeCount++;
        totalTermlySubsidy += s.termlySubsidyAmount;
        totalAnnualSubsidy += s.annualSubsidyAmount;
      } else if (s.sponsorshipStatus === SponsorshipStatus.SUSPENDED) {
        suspendedCount++;
      } else if (s.sponsorshipStatus === SponsorshipStatus.COMPLETED) {
        completedCount++;
      }

      if (s.coverage.lunchCovered) {
        lunchCoveredCount++;
      }
      if (s.coverage.tuitionCovered) {
        tuitionCoveredCount++;
      }
    }

    return {
      totalSponsoredStudents: list.length,
      activeCount,
      suspendedCount,
      completedCount,
      totalTermlySubsidy,
      totalAnnualSubsidy,
      byType,
      byGrade,
      lunchCoveredCount,
      tuitionCoveredCount
    };
  }
}
