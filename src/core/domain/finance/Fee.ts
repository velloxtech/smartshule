import { Entity } from '../shared/Entity';
import { CbcGradeLevel } from '../user/Student';

export enum PaymentMethod {
  PAYSTACK = 'PAYSTACK',
  BANK_TRANSFER = 'BANK_TRANSFER',
  BANK_DEPOSIT = 'BANK_DEPOSIT',
  CARD = 'CARD',
  MPESA = 'MPESA',
  CHEQUE = 'CHEQUE',
  CASH = 'CASH'
}

export enum PaymentStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  FAILED = 'FAILED'
}

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

export interface FeeItem {
  id: string;
  name: string; // e.g. "Tuition", "CBC Assessment & Practical Material", "Activity & Games", "Lunch Programme"
  amount: number;
  isOptional: boolean;
  category: 'TUITION' | 'ASSESSMENT' | 'ACTIVITY' | 'BOARDING' | 'MEALS' | 'TRANSPORT' | 'OTHER';
}

// 1. Fee Structure Entity
export interface FeeStructureProps {
  schoolId: string;
  academicYearId: string;
  termId: string;
  gradeLevel: CbcGradeLevel;
  title: string;
  items: FeeItem[];
  dueDate: string;
}

export class FeeStructure extends Entity<FeeStructureProps> {
  public static create(props: FeeStructureProps, id: string, createdAt?: Date, updatedAt?: Date): FeeStructure {
    return new FeeStructure(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get termId(): string {
    return this._props.termId;
  }

  public get gradeLevel(): CbcGradeLevel {
    return this._props.gradeLevel;
  }

  public get title(): string {
    return this._props.title;
  }

  public get items(): FeeItem[] {
    return this._props.items;
  }

  public get totalAmount(): number {
    return this._props.items.reduce((sum, item) => sum + item.amount, 0);
  }

  public get mandatoryAmount(): number {
    return this._props.items.filter(i => !i.isOptional).reduce((sum, item) => sum + item.amount, 0);
  }

  public get dueDate(): string {
    return this._props.dueDate;
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      academicYearId: this.academicYearId,
      termId: this.termId,
      gradeLevel: this.gradeLevel,
      title: this.title,
      items: this.items,
      totalAmount: this.totalAmount,
      mandatoryAmount: this.mandatoryAmount,
      dueDate: this.dueDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// 2. Student Invoice Entity
export interface StudentInvoiceProps {
  schoolId: string;
  studentId: string;
  feeStructureId: string;
  academicYearId: string;
  termId: string;
  invoiceNumber: string;
  items: FeeItem[];
  amountBilled: number;
  discountAmount: number;
  amountPayable: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  dueDate: string;
}

export class StudentInvoice extends Entity<StudentInvoiceProps> {
  public static create(props: StudentInvoiceProps, id: string, createdAt?: Date, updatedAt?: Date): StudentInvoice {
    return new StudentInvoice(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get studentId(): string {
    return this._props.studentId;
  }

  public get invoiceNumber(): string {
    return this._props.invoiceNumber;
  }

  public get feeStructureId(): string {
    return this._props.feeStructureId;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get termId(): string {
    return this._props.termId;
  }

  public get items(): FeeItem[] {
    return this._props.items;
  }

  public get amountBilled(): number {
    return this._props.amountBilled;
  }

  public get discountAmount(): number {
    return this._props.discountAmount;
  }

  public get amountPayable(): number {
    return this._props.amountPayable;
  }

  public get amountPaid(): number {
    return this._props.amountPaid;
  }

  public get balance(): number {
    return this._props.balance;
  }

  public get status(): InvoiceStatus {
    return this._props.status;
  }

  public get dueDate(): string {
    return this._props.dueDate;
  }

  public recordPayment(amount: number): void {
    this._props.amountPaid += amount;
    this._props.balance = Math.max(0, this._props.amountPayable - this._props.amountPaid);

    if (this._props.balance === 0) {
      this._props.status = InvoiceStatus.PAID;
    } else if (this._props.amountPaid > 0) {
      this._props.status = InvoiceStatus.PARTIALLY_PAID;
    }
    this.touch();
  }

  public applyDiscount(discount: number): void {
    this._props.discountAmount = discount;
    this._props.amountPayable = Math.max(0, this._props.amountBilled - discount);
    this._props.balance = Math.max(0, this._props.amountPayable - this._props.amountPaid);
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      studentId: this.studentId,
      feeStructureId: this.feeStructureId,
      academicYearId: this.academicYearId,
      termId: this.termId,
      invoiceNumber: this.invoiceNumber,
      items: this.items,
      amountBilled: this.amountBilled,
      discountAmount: this.discountAmount,
      amountPayable: this.amountPayable,
      amountPaid: this.amountPaid,
      balance: this.balance,
      status: this.status,
      dueDate: this.dueDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// 3. Payment Record Entity
export interface PaymentProps {
  schoolId: string;
  invoiceId: string;
  studentId: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference: string; // M-Pesa code (e.g. QHJ8921KL), Bank slip ref, Cheque no.
  mpesaPhoneNumber?: string;
  paymentDate: string; // YYYY-MM-DD
  recordedByUserId: string;
  status: PaymentStatus;
  notes?: string;
}

export class Payment extends Entity<PaymentProps> {
  public static create(props: PaymentProps, id: string, createdAt?: Date, updatedAt?: Date): Payment {
    return new Payment(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get invoiceId(): string {
    return this._props.invoiceId;
  }

  public get studentId(): string {
    return this._props.studentId;
  }

  public get receiptNumber(): string {
    return this._props.receiptNumber;
  }

  public get amount(): number {
    return this._props.amount;
  }

  public get paymentMethod(): PaymentMethod {
    return this._props.paymentMethod;
  }

  public get transactionReference(): string {
    return this._props.transactionReference;
  }

  public get mpesaPhoneNumber(): string | undefined {
    return this._props.mpesaPhoneNumber;
  }

  public get paymentDate(): string {
    return this._props.paymentDate;
  }

  public get recordedByUserId(): string {
    return this._props.recordedByUserId;
  }

  public get status(): PaymentStatus {
    return this._props.status;
  }

  public get notes(): string | undefined {
    return this._props.notes;
  }

  public setStatus(status: PaymentStatus): void {
    this._props.status = status;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      invoiceId: this.invoiceId,
      studentId: this.studentId,
      receiptNumber: this.receiptNumber,
      amount: this.amount,
      paymentMethod: this.paymentMethod,
      transactionReference: this.transactionReference,
      mpesaPhoneNumber: this.mpesaPhoneNumber,
      paymentDate: this.paymentDate,
      recordedByUserId: this.recordedByUserId,
      status: this.status,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
