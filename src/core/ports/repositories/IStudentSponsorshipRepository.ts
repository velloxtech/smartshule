import {
  StudentSponsorship,
  SponsorshipType,
  SponsorshipStatus
} from '../../domain/sponsorship/StudentSponsorship';
import { CBCGradeLevel } from '../../domain/user/Student';

export interface SponsorshipFilterCriteria {
  schoolId?: string;
  studentId?: string;
  gradeLevel?: CBCGradeLevel;
  sponsorshipType?: SponsorshipType;
  sponsorshipStatus?: SponsorshipStatus;
  academicYearId?: string;
  search?: string;
}

export interface SponsorshipStats {
  totalSponsoredStudents: number;
  activeCount: number;
  suspendedCount: number;
  completedCount: number;
  totalTermlySubsidy: number;
  totalAnnualSubsidy: number;
  byType: Record<string, number>;
  byGrade: Record<string, number>;
  lunchCoveredCount: number;
  tuitionCoveredCount: number;
}

export interface IStudentSponsorshipRepository {
  findById(id: string): Promise<StudentSponsorship | null>;
  findByStudentId(studentId: string): Promise<StudentSponsorship | null>;
  findByAdmissionNumber(admissionNumber: string, schoolId?: string): Promise<StudentSponsorship | null>;
  findAll(filters?: SponsorshipFilterCriteria): Promise<StudentSponsorship[]>;
  save(sponsorship: StudentSponsorship): Promise<void>;
  update(sponsorship: StudentSponsorship): Promise<void>;
  delete(id: string): Promise<void>;
  getStats(schoolId?: string): Promise<SponsorshipStats>;
}
