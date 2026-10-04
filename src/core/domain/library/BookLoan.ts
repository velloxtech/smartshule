import { Entity } from '../shared/Entity';

export type BorrowerType = 'STUDENT' | 'TEACHER' | 'STAFF';
export type BookLoanStatus = 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST' | 'DAMAGED';

export interface BookLoanProps {
  schoolId: string;
  bookId: string;
  bookTitle: string;
  borrowerType: BorrowerType;
  borrowerId: string;
  borrowerName: string;
  borrowerAdmissionOrNumber?: string;
  borrowerGradeOrClass?: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: BookLoanStatus;
  fineAmount: number;
  finePaid: boolean;
  remarks?: string;
  issuedByUserId?: string;
  receivedByUserId?: string;
}

export class BookLoan extends Entity<BookLoanProps> {
  public static create(
    props: {
      schoolId: string;
      bookId: string;
      bookTitle: string;
      borrowerType: BorrowerType;
      borrowerId: string;
      borrowerName: string;
      borrowerAdmissionOrNumber?: string;
      borrowerGradeOrClass?: string;
      issueDate: string;
      dueDate: string;
      returnDate?: string;
      status?: BookLoanStatus;
      fineAmount?: number;
      finePaid?: boolean;
      remarks?: string;
      issuedByUserId?: string;
      receivedByUserId?: string;
    },
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): BookLoan {
    return new BookLoan(
      {
        schoolId: props.schoolId,
        bookId: props.bookId,
        bookTitle: props.bookTitle,
        borrowerType: props.borrowerType || 'STUDENT',
        borrowerId: props.borrowerId,
        borrowerName: props.borrowerName,
        borrowerAdmissionOrNumber: props.borrowerAdmissionOrNumber,
        borrowerGradeOrClass: props.borrowerGradeOrClass,
        issueDate: props.issueDate,
        dueDate: props.dueDate,
        returnDate: props.returnDate,
        status: props.status || 'ISSUED',
        fineAmount: props.fineAmount !== undefined ? Math.max(0, props.fineAmount) : 0,
        finePaid: props.finePaid ?? false,
        remarks: props.remarks,
        issuedByUserId: props.issuedByUserId,
        receivedByUserId: props.receivedByUserId
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get bookId(): string {
    return this._props.bookId;
  }

  public get bookTitle(): string {
    return this._props.bookTitle;
  }

  public get borrowerType(): BorrowerType {
    return this._props.borrowerType;
  }

  public get borrowerId(): string {
    return this._props.borrowerId;
  }

  public get borrowerName(): string {
    return this._props.borrowerName;
  }

  public get borrowerAdmissionOrNumber(): string | undefined {
    return this._props.borrowerAdmissionOrNumber;
  }

  public get borrowerGradeOrClass(): string | undefined {
    return this._props.borrowerGradeOrClass;
  }

  public get issueDate(): string {
    return this._props.issueDate;
  }

  public get dueDate(): string {
    return this._props.dueDate;
  }

  public get returnDate(): string | undefined {
    return this._props.returnDate;
  }

  public get status(): BookLoanStatus {
    return this._props.status;
  }

  public get fineAmount(): number {
    return this._props.fineAmount;
  }

  public get finePaid(): boolean {
    return this._props.finePaid;
  }

  public get remarks(): string | undefined {
    return this._props.remarks;
  }

  public get issuedByUserId(): string | undefined {
    return this._props.issuedByUserId;
  }

  public get receivedByUserId(): string | undefined {
    return this._props.receivedByUserId;
  }

  public markReturned(params: {
    returnDate?: string;
    receivedByUserId?: string;
    fineAmount?: number;
    finePaid?: boolean;
    remarks?: string;
  }): void {
    this._props.status = 'RETURNED';
    this._props.returnDate = params.returnDate || new Date().toISOString().split('T')[0];
    if (params.receivedByUserId) this._props.receivedByUserId = params.receivedByUserId;
    if (params.fineAmount !== undefined) this._props.fineAmount = Math.max(0, params.fineAmount);
    if (params.finePaid !== undefined) this._props.finePaid = params.finePaid;
    if (params.remarks) this._props.remarks = params.remarks;
    this.touch();
  }

  public markOverdue(): void {
    if (this._props.status === 'ISSUED') {
      this._props.status = 'OVERDUE';
      this.touch();
    }
  }

  public markLost(remarks?: string, fineAmount?: number): void {
    this._props.status = 'LOST';
    if (remarks) this._props.remarks = remarks;
    if (fineAmount !== undefined) this._props.fineAmount = fineAmount;
    this.touch();
  }

  public markDamaged(remarks?: string, fineAmount?: number): void {
    this._props.status = 'DAMAGED';
    if (remarks) this._props.remarks = remarks;
    if (fineAmount !== undefined) this._props.fineAmount = fineAmount;
    this.touch();
  }

  public updateFine(fineAmount: number, finePaid?: boolean): void {
    this._props.fineAmount = Math.max(0, fineAmount);
    if (finePaid !== undefined) this._props.finePaid = finePaid;
    this.touch();
  }

  public toJSON(): BookLoanProps & { id: string; createdAt: Date; updatedAt: Date } {
    return {
      id: this.id,
      schoolId: this.schoolId,
      bookId: this.bookId,
      bookTitle: this.bookTitle,
      borrowerType: this.borrowerType,
      borrowerId: this.borrowerId,
      borrowerName: this.borrowerName,
      borrowerAdmissionOrNumber: this.borrowerAdmissionOrNumber,
      borrowerGradeOrClass: this.borrowerGradeOrClass,
      issueDate: this.issueDate,
      dueDate: this.dueDate,
      returnDate: this.returnDate,
      status: this.status,
      fineAmount: this.fineAmount,
      finePaid: this.finePaid,
      remarks: this.remarks,
      issuedByUserId: this.issuedByUserId,
      receivedByUserId: this.receivedByUserId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
