import { IStudentSponsorshipRepository, SponsorshipFilterCriteria, SponsorshipStats } from '../../core/ports/repositories/IStudentSponsorshipRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import {
  StudentSponsorship,
  SponsorshipType,
  SponsorshipStatus,
  SponsorshipCoverage
} from '../../core/domain/sponsorship/StudentSponsorship';
import { CBCGradeLevel, StudentGender } from '../../core/domain/user/Student';
import { UserRole } from '../../core/domain/user/User';
import { IdGenerator, ForbiddenError, NotFoundError, ValidationError, ConflictError } from '../../core/domain/shared/Errors';
import { IFeeRepository } from '../../core/ports/repositories/IFeeRepository';
import { InvoiceStatus } from '../../core/domain/finance/Fee';

export interface UserContext {
  userId: string;
  role: UserRole;
  schoolId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface CreateStudentSponsorshipDTO {
  schoolId?: string;
  studentId: string;
  sponsorshipType: SponsorshipType;
  sponsorshipStatus?: SponsorshipStatus;
  coverage?: Partial<SponsorshipCoverage>;
  sponsorName: string;
  sponsorContact?: string;
  termlySubsidyAmount?: number;
  annualSubsidyAmount?: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  academicYearId?: string;
  approvalReference?: string;
  reasonNotes: string;
  confidentialNotes?: string;
}

export interface UpdateStudentSponsorshipDTO {
  sponsorshipType?: SponsorshipType;
  sponsorshipStatus?: SponsorshipStatus;
  coverage?: Partial<SponsorshipCoverage>;
  sponsorName?: string;
  sponsorContact?: string;
  termlySubsidyAmount?: number;
  annualSubsidyAmount?: number;
  startDate?: string;
  endDate?: string;
  academicYearId?: string;
  approvalReference?: string;
  reasonNotes?: string;
  confidentialNotes?: string;
}

export class StudentSponsorshipUseCases {
  constructor(
    private sponsorshipRepository: IStudentSponsorshipRepository,
    private studentRepository: IStudentRepository,
    private feeRepository?: IFeeRepository
  ) {}

  private verifyAdminAccess(requestingUser?: UserContext): void {
    if (
      !requestingUser ||
      ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN].includes(requestingUser.role)
    ) {
      throw new ForbiddenError(
        'Access Denied: The Fully Sponsored Students dossier is confidential and strictly accessible by the School Director and Administrators only.'
      );
    }
  }

  public async createSponsorship(
    dto: CreateStudentSponsorshipDTO,
    requestingUser?: UserContext
  ): Promise<any> {
    this.verifyAdminAccess(requestingUser);

    if (!dto.studentId) {
      throw new ValidationError('A valid studentId is required to establish a sponsorship record.');
    }
    if (!dto.sponsorName || !dto.sponsorName.trim()) {
      throw new ValidationError('Sponsor or benefactor name is required.');
    }
    if (!dto.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(dto.startDate)) {
      throw new ValidationError('A valid sponsorship startDate in YYYY-MM-DD format is required.');
    }

    const student = await this.studentRepository.findById(dto.studentId);
    if (!student) {
      throw new NotFoundError('Student', dto.studentId);
    }

    // Check if an active sponsorship record already exists for this learner
    const existing = await this.sponsorshipRepository.findByStudentId(dto.studentId);
    if (existing && existing.sponsorshipStatus === SponsorshipStatus.ACTIVE) {
      throw new ConflictError(
        `Learner ${student.fullName} already has an active sponsorship record (Ref: ${existing.approvalReference}). Please update the existing record.`
      );
    }

    const schoolId = dto.schoolId || student.schoolId || requestingUser?.schoolId || 'school-001';
    const academicYearId = dto.academicYearId || student.academicYearId || `year-${new Date().getFullYear()}`;

    // Generate clean approval reference if not provided: e.g. DIR-SCH-2026-001
    let approvalRef = dto.approvalReference?.trim();
    if (!approvalRef) {
      const year = new Date().getFullYear();
      const count = (await this.sponsorshipRepository.findAll({ schoolId })).length + 1;
      approvalRef = `DIR-SCH-${year}-${String(count).padStart(3, '0')}`;
    }

    // Default financial subsidies based on grade level if not specified
    let termlyAmount = Number(dto.termlySubsidyAmount);
    if (isNaN(termlyAmount) || termlyAmount <= 0) {
      // Grace Seeds School Termly Rate Baseline: PP1/PP2: 12,000; Grade 1-3: 15,000; Grade 4-6: 18,000
      const isUpper = [CBCGradeLevel.GRADE_4, CBCGradeLevel.GRADE_5, CBCGradeLevel.GRADE_6].includes(student.gradeLevel);
      const isLower = [CBCGradeLevel.GRADE_1, CBCGradeLevel.GRADE_2, CBCGradeLevel.GRADE_3].includes(student.gradeLevel);
      termlyAmount = isUpper ? 18000 : (isLower ? 15000 : 12000);
    }
    const annualAmount = Number(dto.annualSubsidyAmount) || (termlyAmount * 3);

    const userName = requestingUser?.firstName
      ? `${requestingUser.firstName} ${requestingUser.lastName || ''}`.trim()
      : (requestingUser?.role === UserRole.ADMIN ? 'School Director' : 'Administrator');

    const sponsorship = StudentSponsorship.create(
      {
        schoolId,
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        studentName: student.fullName,
        gradeLevel: student.gradeLevel,
        streamName: student.streamId,
        gender: student.gender,
        sponsorshipType: dto.sponsorshipType || SponsorshipType.DIRECTOR_BENEVOLENCE,
        sponsorshipStatus: dto.sponsorshipStatus || SponsorshipStatus.ACTIVE,
        coverage: {
          tuitionCovered: dto.coverage?.tuitionCovered ?? true,
          lunchCovered: dto.coverage?.lunchCovered ?? false,
          materialsCovered: dto.coverage?.materialsCovered ?? true,
          uniformCovered: dto.coverage?.uniformCovered ?? false,
          activitiesCovered: dto.coverage?.activitiesCovered ?? true,
          percentageCovered: dto.coverage?.percentageCovered ?? 100
        },
        sponsorName: dto.sponsorName.trim(),
        sponsorContact: dto.sponsorContact?.trim(),
        termlySubsidyAmount: termlyAmount,
        annualSubsidyAmount: annualAmount,
        startDate: dto.startDate,
        endDate: dto.endDate,
        academicYearId,
        approvalReference: approvalRef,
        approvedByUserId: requestingUser?.userId || 'admin',
        approvedByUserName: userName,
        reasonNotes: dto.reasonNotes?.trim() || "Approved under the School Director's Full Educational Sponsorship Scheme.",
        confidentialNotes: dto.confidentialNotes?.trim()
      },
      IdGenerator.generate()
    );

    await this.sponsorshipRepository.save(sponsorship);

    // Apply full institutional waiver to any existing unpaid invoices so the student cannot be charged
    if (this.feeRepository) {
      try {
        const studentInvoices = await this.feeRepository.findInvoices({ studentId: student.id });
        for (const inv of studentInvoices) {
          if (inv.balance > 0 && (inv.status as any) !== InvoiceStatus.CARRIED_FORWARD) {
            inv.applyDiscount(inv.amountBilled);
            await this.feeRepository.updateInvoice(inv);
          }
        }
      } catch (err) {
        console.warn('[StudentSponsorshipUseCases] Auto-waive invoices error:', err);
      }
    }

    return sponsorship.toJSON();
  }

  public async updateSponsorship(
    id: string,
    dto: UpdateStudentSponsorshipDTO,
    requestingUser?: UserContext
  ): Promise<any> {
    this.verifyAdminAccess(requestingUser);

    const sponsorship = await this.sponsorshipRepository.findById(id);
    if (!sponsorship) {
      throw new NotFoundError('StudentSponsorship', id);
    }

    sponsorship.updateDetails({
      sponsorshipType: dto.sponsorshipType,
      sponsorshipStatus: dto.sponsorshipStatus,
      coverage: dto.coverage ? {
        ...sponsorship.coverage,
        ...dto.coverage
      } : undefined,
      sponsorName: dto.sponsorName,
      sponsorContact: dto.sponsorContact,
      termlySubsidyAmount: dto.termlySubsidyAmount,
      annualSubsidyAmount: dto.annualSubsidyAmount,
      startDate: dto.startDate,
      endDate: dto.endDate,
      academicYearId: dto.academicYearId,
      approvalReference: dto.approvalReference,
      reasonNotes: dto.reasonNotes,
      confidentialNotes: dto.confidentialNotes
    });

    await this.sponsorshipRepository.update(sponsorship);
    return sponsorship.toJSON();
  }

  public async updateSponsorshipStatus(
    id: string,
    status: SponsorshipStatus,
    confidentialRemark?: string,
    requestingUser?: UserContext
  ): Promise<any> {
    this.verifyAdminAccess(requestingUser);

    const sponsorship = await this.sponsorshipRepository.findById(id);
    if (!sponsorship) {
      throw new NotFoundError('StudentSponsorship', id);
    }

    sponsorship.setStatus(status, confidentialRemark);
    await this.sponsorshipRepository.update(sponsorship);
    return sponsorship.toJSON();
  }

  public async getSponsorshipById(id: string, requestingUser?: UserContext): Promise<any> {
    this.verifyAdminAccess(requestingUser);

    const sponsorship = await this.sponsorshipRepository.findById(id);
    if (!sponsorship) {
      throw new NotFoundError('StudentSponsorship', id);
    }
    return sponsorship.toJSON();
  }

  public async getSponsorshipByStudentId(studentId: string, requestingUser?: UserContext): Promise<any> {
    this.verifyAdminAccess(requestingUser);

    const sponsorship = await this.sponsorshipRepository.findByStudentId(studentId);
    if (!sponsorship) {
      return null;
    }
    return sponsorship.toJSON();
  }

  public async listSponsorships(
    filters?: SponsorshipFilterCriteria,
    requestingUser?: UserContext
  ): Promise<any[]> {
    this.verifyAdminAccess(requestingUser);

    const targetSchoolId = filters?.schoolId || requestingUser?.schoolId;
    const results = await this.sponsorshipRepository.findAll({
      ...filters,
      schoolId: targetSchoolId
    });

    return results.map(s => s.toJSON());
  }

  public async deleteSponsorship(id: string, requestingUser?: UserContext): Promise<{ success: boolean; message: string }> {
    this.verifyAdminAccess(requestingUser);

    const sponsorship = await this.sponsorshipRepository.findById(id);
    if (!sponsorship) {
      throw new NotFoundError('StudentSponsorship', id);
    }

    await this.sponsorshipRepository.delete(id);
    return {
      success: true,
      message: `Sponsorship record (Ref: ${sponsorship.approvalReference}) for learner ${sponsorship.studentName} has been permanently deleted.`
    };
  }

  public async getStats(schoolId?: string, requestingUser?: UserContext): Promise<SponsorshipStats> {
    this.verifyAdminAccess(requestingUser);

    const targetSchoolId = schoolId || requestingUser?.schoolId;
    return this.sponsorshipRepository.getStats(targetSchoolId);
  }
}
