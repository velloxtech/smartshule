import { Entity } from '../shared/Entity';

export interface DeletedStudentLinkedData {
  invoices: any[];
  payments: any[];
  lunchEnrollments: any[];
  lunchPayments: any[];
  formativeAssessments: any[];
  summativeAssessments: any[];
  reportCards: any[];
  attendanceRecords: any[];
  complaints: any[];
  ediaryEntries: any[];
  progressPhotos: any[];
  helpRequests: any[];
  guardians: any[];
}

export interface ClearedPendingWork {
  clearedInvoicesCount: number;
  clearedInvoiceBalances: number;
  clearedInvoices: Array<{ id: string; invoiceNumber: string; balance: number; status: string }>;
  clearedLunchBalances: number;
  clearedLunchEnrollments: Array<{ id: string; planName: string; balance: number; paymentStatus: string }>;
  resolvedComplaintsCount: number;
  resolvedComplaints: Array<{ id: string; title: string }>;
  clearedEdiaryItemsCount: number;
  unlinkedGuardiansCount: number;
  clearedParentAccountsCount?: number;
  archivedParentsCount?: number;
  summaryText: string;
}

export interface DeletedStudentProps {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  upiNumber?: string;
  schoolId: string;
  gradeLevel: string;
  classroomId?: string;
  streamId?: string;
  academicYearId?: string;
  studentData: any;
  linkedData: DeletedStudentLinkedData;
  pendingWorkCleared: ClearedPendingWork;
  deletedAt: Date;
  deletedByUserId?: string;
  reason?: string;
}

export class DeletedStudent extends Entity<DeletedStudentProps> {
  public static create(
    props: DeletedStudentProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): DeletedStudent {
    return new DeletedStudent(props, id, createdAt, updatedAt);
  }

  public get studentId(): string {
    return this._props.studentId;
  }

  public get admissionNumber(): string {
    return this._props.admissionNumber;
  }

  public get firstName(): string {
    return this._props.firstName;
  }

  public get middleName(): string | undefined {
    return this._props.middleName;
  }

  public get lastName(): string {
    return this._props.lastName;
  }

  public get fullName(): string {
    return [this._props.firstName, this._props.middleName, this._props.lastName]
      .filter(Boolean)
      .join(' ');
  }

  public get upiNumber(): string | undefined {
    return this._props.upiNumber;
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get gradeLevel(): string {
    return this._props.gradeLevel;
  }

  public get classroomId(): string | undefined {
    return this._props.classroomId;
  }

  public get streamId(): string | undefined {
    return this._props.streamId;
  }

  public get academicYearId(): string | undefined {
    return this._props.academicYearId;
  }

  public get studentData(): any {
    return this._props.studentData;
  }

  public get linkedData(): DeletedStudentLinkedData {
    return this._props.linkedData;
  }

  public get pendingWorkCleared(): ClearedPendingWork {
    return this._props.pendingWorkCleared;
  }

  public get deletedAt(): Date {
    return this._props.deletedAt;
  }

  public get deletedByUserId(): string | undefined {
    return this._props.deletedByUserId;
  }

  public get reason(): string | undefined {
    return this._props.reason;
  }

  public toJSON() {
    return {
      id: this.id,
      studentId: this.studentId,
      admissionNumber: this.admissionNumber,
      firstName: this.firstName,
      middleName: this.middleName,
      lastName: this.lastName,
      fullName: this.fullName,
      upiNumber: this.upiNumber,
      schoolId: this.schoolId,
      gradeLevel: this.gradeLevel,
      classroomId: this.classroomId,
      streamId: this.streamId,
      academicYearId: this.academicYearId,
      studentData: this.studentData,
      linkedData: this.linkedData,
      pendingWorkCleared: this.pendingWorkCleared,
      deletedAt: this.deletedAt,
      deletedByUserId: this.deletedByUserId,
      reason: this.reason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
