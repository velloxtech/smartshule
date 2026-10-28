import { Entity } from '../shared/Entity';
import { CBCGradeLevel, StudentGender } from '../user/Student';

export enum SponsorshipType {
  DIRECTOR_BENEVOLENCE = 'DIRECTOR_BENEVOLENCE',
  ACADEMIC_MERIT = 'ACADEMIC_MERIT',
  NEEDY_VULNERABLE = 'NEEDY_VULNERABLE',
  STAFF_CHILD_WAIVER = 'STAFF_CHILD_WAIVER',
  ORPHAN_ASSISTANCE = 'ORPHAN_ASSISTANCE',
  BOARD_TRUSTEE = 'BOARD_TRUSTEE',
  SPECIAL_TALENT = 'SPECIAL_TALENT'
}

export enum SponsorshipStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  COMPLETED = 'COMPLETED',
  REVOKED = 'REVOKED'
}

export interface SponsorshipCoverage {
  tuitionCovered: boolean;
  lunchCovered: boolean;
  materialsCovered: boolean;
  uniformCovered: boolean;
  activitiesCovered: boolean;
  percentageCovered: number; // default: 100 for fully sponsored
}

export interface StudentSponsorshipProps {
  schoolId: string;
  studentId: string;
  admissionNumber: string;
  studentName: string;
  gradeLevel: CBCGradeLevel;
  streamName?: string;
  gender?: StudentGender;
  sponsorshipType: SponsorshipType;
  sponsorshipStatus: SponsorshipStatus;
  coverage: SponsorshipCoverage;
  sponsorName: string;
  sponsorContact?: string;
  termlySubsidyAmount: number;
  annualSubsidyAmount: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  academicYearId: string;
  approvalReference: string;
  approvedByUserId: string;
  approvedByUserName: string;
  reasonNotes: string;
  confidentialNotes?: string;
}

export class StudentSponsorship extends Entity<StudentSponsorshipProps> {
  public static create(
    props: StudentSponsorshipProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): StudentSponsorship {
    return new StudentSponsorship(
      {
        ...props,
        sponsorshipStatus: props.sponsorshipStatus || SponsorshipStatus.ACTIVE,
        coverage: {
          tuitionCovered: props.coverage?.tuitionCovered ?? true,
          lunchCovered: props.coverage?.lunchCovered ?? false,
          materialsCovered: props.coverage?.materialsCovered ?? true,
          uniformCovered: props.coverage?.uniformCovered ?? false,
          activitiesCovered: props.coverage?.activitiesCovered ?? true,
          percentageCovered: props.coverage?.percentageCovered ?? 100
        },
        termlySubsidyAmount: Number(props.termlySubsidyAmount) || 0,
        annualSubsidyAmount: Number(props.annualSubsidyAmount) || (Number(props.termlySubsidyAmount || 0) * 3)
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get studentId(): string {
    return this._props.studentId;
  }

  public get admissionNumber(): string {
    return this._props.admissionNumber;
  }

  public get studentName(): string {
    return this._props.studentName;
  }

  public get gradeLevel(): CBCGradeLevel {
    return this._props.gradeLevel;
  }

  public get streamName(): string | undefined {
    return this._props.streamName;
  }

  public get gender(): StudentGender | undefined {
    return this._props.gender;
  }

  public get sponsorshipType(): SponsorshipType {
    return this._props.sponsorshipType;
  }

  public get sponsorshipStatus(): SponsorshipStatus {
    return this._props.sponsorshipStatus;
  }

  public get coverage(): SponsorshipCoverage {
    return this._props.coverage;
  }

  public get sponsorName(): string {
    return this._props.sponsorName;
  }

  public get sponsorContact(): string | undefined {
    return this._props.sponsorContact;
  }

  public get termlySubsidyAmount(): number {
    return this._props.termlySubsidyAmount;
  }

  public get annualSubsidyAmount(): number {
    return this._props.annualSubsidyAmount;
  }

  public get startDate(): string {
    return this._props.startDate;
  }

  public get endDate(): string | undefined {
    return this._props.endDate;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get approvalReference(): string {
    return this._props.approvalReference;
  }

  public get approvedByUserId(): string {
    return this._props.approvedByUserId;
  }

  public get approvedByUserName(): string {
    return this._props.approvedByUserName;
  }

  public get reasonNotes(): string {
    return this._props.reasonNotes;
  }

  public get confidentialNotes(): string | undefined {
    return this._props.confidentialNotes;
  }

  public updateDetails(params: Partial<StudentSponsorshipProps>): void {
    if (params.admissionNumber) this._props.admissionNumber = params.admissionNumber;
    if (params.studentName) this._props.studentName = params.studentName;
    if (params.gradeLevel) this._props.gradeLevel = params.gradeLevel;
    if (params.streamName !== undefined) this._props.streamName = params.streamName;
    if (params.gender) this._props.gender = params.gender;
    if (params.sponsorshipType) this._props.sponsorshipType = params.sponsorshipType;
    if (params.coverage) {
      this._props.coverage = {
        ...this._props.coverage,
        ...params.coverage
      };
    }
    if (params.sponsorName) this._props.sponsorName = params.sponsorName;
    if (params.sponsorContact !== undefined) this._props.sponsorContact = params.sponsorContact;
    if (params.termlySubsidyAmount !== undefined) {
      this._props.termlySubsidyAmount = Number(params.termlySubsidyAmount);
      this._props.annualSubsidyAmount = this._props.termlySubsidyAmount * 3;
    }
    if (params.annualSubsidyAmount !== undefined) {
      this._props.annualSubsidyAmount = Number(params.annualSubsidyAmount);
    }
    if (params.startDate) this._props.startDate = params.startDate;
    if (params.endDate !== undefined) this._props.endDate = params.endDate;
    if (params.academicYearId) this._props.academicYearId = params.academicYearId;
    if (params.approvalReference) this._props.approvalReference = params.approvalReference;
    if (params.reasonNotes !== undefined) this._props.reasonNotes = params.reasonNotes;
    if (params.confidentialNotes !== undefined) this._props.confidentialNotes = params.confidentialNotes;
    this.touch();
  }

  public setStatus(status: SponsorshipStatus, confidentialRemark?: string): void {
    this._props.sponsorshipStatus = status;
    if (confidentialRemark) {
      const timestamp = new Date().toISOString().split('T')[0];
      const existing = this._props.confidentialNotes ? `${this._props.confidentialNotes}\n` : '';
      this._props.confidentialNotes = `${existing}[${timestamp} - Status changed to ${status}]: ${confidentialRemark}`;
    }
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      studentId: this.studentId,
      admissionNumber: this.admissionNumber,
      studentName: this.studentName,
      gradeLevel: this.gradeLevel,
      streamName: this.streamName,
      gender: this.gender,
      sponsorshipType: this.sponsorshipType,
      sponsorshipStatus: this.sponsorshipStatus,
      coverage: this.coverage,
      sponsorName: this.sponsorName,
      sponsorContact: this.sponsorContact,
      termlySubsidyAmount: this.termlySubsidyAmount,
      annualSubsidyAmount: this.annualSubsidyAmount,
      startDate: this.startDate,
      endDate: this.endDate,
      academicYearId: this.academicYearId,
      approvalReference: this.approvalReference,
      approvedByUserId: this.approvedByUserId,
      approvedByUserName: this.approvedByUserName,
      reasonNotes: this.reasonNotes,
      confidentialNotes: this.confidentialNotes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
