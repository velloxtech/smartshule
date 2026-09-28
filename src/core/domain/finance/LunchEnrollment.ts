import { Entity } from '../shared/Entity';
import { PaymentMethod } from './Fee';

export enum LunchEnrollmentStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED'
}

export enum LunchPaymentStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  UNPAID = 'UNPAID'
}

export interface LunchPayment {
  id: string;
  lunchEnrollmentId: string;
  studentId: string;
  schoolId: string;
  amount: number;
  receiptNumber: string;
  paymentMethod: PaymentMethod | string;
  transactionReference: string;
  paymentDate: string;
  recordedByUserId?: string;
  notes?: string;
  createdAt: Date;
}

export interface LunchEnrollmentProps {
  schoolId: string;
  studentId: string;
  academicYearId?: string;
  termId?: string;
  planName: string; // e.g. "Standard Hot Lunch", "Special Diet", "Vegetarian"
  amount: number;
  amountPaid: number;
  balance: number;
  paymentStatus: LunchPaymentStatus;
  dietaryNotes?: string; // e.g. "Vegetarian, Allergic to peanuts"
  status: LunchEnrollmentStatus;
  notes?: string;
  enrolledByUserId?: string;
  enrolledAt: Date;
  payments?: LunchPayment[];
}

export class LunchEnrollment extends Entity<LunchEnrollmentProps> {
  public static create(
    props: Omit<LunchEnrollmentProps, 'balance' | 'paymentStatus' | 'amountPaid'> & {
      amountPaid?: number;
      balance?: number;
      paymentStatus?: LunchPaymentStatus;
    },
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): LunchEnrollment {
    const amount = props.amount || 0;
    const amountPaid = props.amountPaid || 0;
    const balance = props.balance !== undefined ? props.balance : Math.max(0, amount - amountPaid);
    
    let paymentStatus = props.paymentStatus;
    if (!paymentStatus) {
      if (amountPaid >= amount && amount > 0) {
        paymentStatus = LunchPaymentStatus.PAID;
      } else if (amountPaid > 0) {
        paymentStatus = LunchPaymentStatus.PARTIAL;
      } else {
        paymentStatus = LunchPaymentStatus.UNPAID;
      }
    }

    return new LunchEnrollment(
      {
        ...props,
        amountPaid,
        balance,
        paymentStatus,
        payments: props.payments || []
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

  public get academicYearId(): string | undefined {
    return this._props.academicYearId;
  }

  public get termId(): string | undefined {
    return this._props.termId;
  }

  public get planName(): string {
    return this._props.planName;
  }

  public get amount(): number {
    return this._props.amount;
  }

  public get amountPaid(): number {
    return this._props.amountPaid;
  }

  public get balance(): number {
    return this._props.balance;
  }

  public get paymentStatus(): LunchPaymentStatus {
    return this._props.paymentStatus;
  }

  public get dietaryNotes(): string | undefined {
    return this._props.dietaryNotes;
  }

  public get status(): LunchEnrollmentStatus {
    return this._props.status;
  }

  public get notes(): string | undefined {
    return this._props.notes;
  }

  public get enrolledByUserId(): string | undefined {
    return this._props.enrolledByUserId;
  }

  public get enrolledAt(): Date {
    return this._props.enrolledAt;
  }

  public get payments(): LunchPayment[] {
    return this._props.payments || [];
  }

  public recordPayment(payment: LunchPayment): void {
    if (!this._props.payments) {
      this._props.payments = [];
    }
    this._props.payments.push(payment);
    this._props.amountPaid += payment.amount;
    this._props.balance = Math.max(0, this._props.amount - this._props.amountPaid);

    if (this._props.balance === 0 && this._props.amount > 0) {
      this._props.paymentStatus = LunchPaymentStatus.PAID;
    } else if (this._props.amountPaid > 0) {
      this._props.paymentStatus = LunchPaymentStatus.PARTIAL;
    } else {
      this._props.paymentStatus = LunchPaymentStatus.UNPAID;
    }

    this.touch();
  }

  public updateDetails(updates: {
    planName?: string;
    amount?: number;
    dietaryNotes?: string;
    status?: LunchEnrollmentStatus;
    notes?: string;
  }): void {
    if (updates.planName !== undefined) {
      this._props.planName = updates.planName;
    }
    if (updates.dietaryNotes !== undefined) {
      this._props.dietaryNotes = updates.dietaryNotes;
    }
    if (updates.status !== undefined) {
      this._props.status = updates.status;
    }
    if (updates.notes !== undefined) {
      this._props.notes = updates.notes;
    }
    if (updates.amount !== undefined) {
      this._props.amount = updates.amount;
      this._props.balance = Math.max(0, this._props.amount - this._props.amountPaid);
      if (this._props.balance === 0 && this._props.amount > 0) {
        this._props.paymentStatus = LunchPaymentStatus.PAID;
      } else if (this._props.amountPaid > 0) {
        this._props.paymentStatus = LunchPaymentStatus.PARTIAL;
      } else {
        this._props.paymentStatus = LunchPaymentStatus.UNPAID;
      }
    }
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      studentId: this.studentId,
      academicYearId: this.academicYearId,
      termId: this.termId,
      planName: this.planName,
      amount: this.amount,
      amountPaid: this.amountPaid,
      balance: this.balance,
      paymentStatus: this.paymentStatus,
      dietaryNotes: this.dietaryNotes,
      status: this.status,
      notes: this.notes,
      enrolledByUserId: this.enrolledByUserId,
      enrolledAt: this.enrolledAt.toISOString(),
      payments: (this._props.payments || []).map(p => ({
        ...p,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt
      })),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
