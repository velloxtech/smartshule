import { Entity } from '../shared/Entity';
import { CbcGradeLevel } from '../user/Student';

export enum PaymentMethod {
  KCB_BUNI = 'KCB_BUNI',
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
  OVERDUE = 'OVERDUE',
  CARRIED_FORWARD = 'CARRIED_FORWARD'
}

export interface FeeItemTermDivision {
  termId?: string;
  termNumber: number; // 1, 2, 3
  termName: string;   // e.g. "Term 1", "Term 2", "Term 3"
  amount: number;
  percentage?: number; // e.g. 50, 30, 20
}

export interface FeeItemTermBreakdown {
  term1?: number;
  term2?: number;
  term3?: number;
  [key: string]: number | undefined;
}

export interface FeeItemTermPercentages {
  term1?: number; // percentage for Term 1 e.g. 50
  term2?: number; // percentage for Term 2 e.g. 30
  term3?: number; // percentage for Term 3 e.g. 20
  [key: string]: number | undefined;
}

export interface FeeItem {
  id: string;
  name: string; // e.g. "Tuition", "CBC Assessment & Practical Material", "Activity & Games", "Admission Fee"
  amount: number; // Whole year full amount (constituted by term divisions)
  isOptional: boolean;
  category: 'TUITION' | 'ASSESSMENT' | 'ACTIVITY' | 'BOARDING' | 'MEALS' | 'TRANSPORT' | 'ADMISSION' | 'OTHER';
  termBreakdown?: FeeItemTermBreakdown;
  termPercentages?: FeeItemTermPercentages;
  termDivisions?: FeeItemTermDivision[];
}

// 1. Fee Structure Entity
export interface FeeStructureProps {
  schoolId: string;
  academicYearId: string;
  termId?: string; // 'ALL' or specific term ID
  gradeLevel: CbcGradeLevel;
  title: string;
  items: FeeItem[];
  dueDate: string;
  termPercentages?: FeeItemTermPercentages;
}

export class FeeStructure extends Entity<FeeStructureProps> {
  public static create(props: FeeStructureProps, id: string, createdAt?: Date, updatedAt?: Date): FeeStructure {
    const normalizedItems: FeeItem[] = (props.items || []).map(item => {
      let t1 = item.termBreakdown?.term1;
      let t2 = item.termBreakdown?.term2;
      let t3 = item.termBreakdown?.term3;

      let p1 = item.termPercentages?.term1;
      let p2 = item.termPercentages?.term2;
      let p3 = item.termPercentages?.term3;

      if (item.termDivisions && item.termDivisions.length > 0) {
        const d1 = item.termDivisions.find(d => d.termNumber === 1);
        const d2 = item.termDivisions.find(d => d.termNumber === 2);
        const d3 = item.termDivisions.find(d => d.termNumber === 3);

        if (t1 === undefined && d1?.amount !== undefined) t1 = d1.amount;
        if (t2 === undefined && d2?.amount !== undefined) t2 = d2.amount;
        if (t3 === undefined && d3?.amount !== undefined) t3 = d3.amount;

        if (p1 === undefined && d1?.percentage !== undefined) p1 = d1.percentage;
        if (p2 === undefined && d2?.percentage !== undefined) p2 = d2.percentage;
        if (p3 === undefined && d3?.percentage !== undefined) p3 = d3.percentage;
      }

      // If global structure percentages were supplied on props and item has none:
      if (p1 === undefined && p2 === undefined && p3 === undefined && props.termPercentages) {
        p1 = props.termPercentages.term1;
        p2 = props.termPercentages.term2;
        p3 = props.termPercentages.term3;
      }

      const rawItemAmount = Number(item.amount) || 0;

      // If percentages are defined with an item amount but term amounts were not given:
      if (rawItemAmount > 0 && (t1 === undefined && t2 === undefined && t3 === undefined) && (p1 !== undefined || p2 !== undefined || p3 !== undefined)) {
        const pct1 = Number(p1) || 0;
        const pct2 = Number(p2) || 0;
        t1 = Math.round((rawItemAmount * pct1) / 100);
        t2 = Math.round((rawItemAmount * pct2) / 100);
        t3 = Math.max(0, rawItemAmount - t1 - t2);
      }

      // If term amounts are defined, the annual amount is their exact sum
      const termSum = (Number(t1) || 0) + (Number(t2) || 0) + (Number(t3) || 0);
      const totalAmount = termSum > 0 ? termSum : rawItemAmount;

      // Distribute evenly if no term breakdown was provided for legacy items
      const termBreakdown: FeeItemTermBreakdown = {
        term1: t1 !== undefined ? Number(t1) : Math.round(totalAmount / 3),
        term2: t2 !== undefined ? Number(t2) : Math.round(totalAmount / 3),
        term3: t3 !== undefined ? Number(t3) : Math.max(0, totalAmount - (Math.round(totalAmount / 3) * 2))
      };

      // Calculate term percentages
      const calcP1 = totalAmount > 0 ? Number(((termBreakdown.term1! / totalAmount) * 100).toFixed(1)) : (p1 ?? 0);
      const calcP2 = totalAmount > 0 ? Number(((termBreakdown.term2! / totalAmount) * 100).toFixed(1)) : (p2 ?? 0);
      const calcP3 = totalAmount > 0 ? Number(((termBreakdown.term3! / totalAmount) * 100).toFixed(1)) : (p3 ?? 0);

      const termPercentages: FeeItemTermPercentages = {
        term1: calcP1,
        term2: calcP2,
        term3: calcP3
      };

      const termDivisions: FeeItemTermDivision[] = [
        { termNumber: 1, termName: 'Term 1', amount: termBreakdown.term1 || 0, percentage: calcP1 },
        { termNumber: 2, termName: 'Term 2', amount: termBreakdown.term2 || 0, percentage: calcP2 },
        { termNumber: 3, termName: 'Term 3', amount: termBreakdown.term3 || 0, percentage: calcP3 }
      ];

      return {
        ...item,
        amount: totalAmount,
        termBreakdown,
        termPercentages,
        termDivisions
      };
    });

    return new FeeStructure(
      {
        ...props,
        termId: props.termId || 'ALL',
        items: normalizedItems
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get termId(): string {
    return this._props.termId || 'ALL';
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
    return this._props.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }

  public get term1Total(): number {
    return this._props.items.reduce((sum, item) => {
      if (item.termBreakdown?.term1 !== undefined) return sum + (Number(item.termBreakdown.term1) || 0);
      const div = item.termDivisions?.find(d => d.termNumber === 1);
      return sum + (div ? Number(div.amount) || 0 : (Number(item.amount) || 0) / 3);
    }, 0);
  }

  public get term2Total(): number {
    return this._props.items.reduce((sum, item) => {
      if (item.termBreakdown?.term2 !== undefined) return sum + (Number(item.termBreakdown.term2) || 0);
      const div = item.termDivisions?.find(d => d.termNumber === 2);
      return sum + (div ? Number(div.amount) || 0 : (Number(item.amount) || 0) / 3);
    }, 0);
  }

  public get term3Total(): number {
    return this._props.items.reduce((sum, item) => {
      if (item.termBreakdown?.term3 !== undefined) return sum + (Number(item.termBreakdown.term3) || 0);
      const div = item.termDivisions?.find(d => d.termNumber === 3);
      return sum + (div ? Number(div.amount) || 0 : (Number(item.amount) || 0) / 3);
    }, 0);
  }

  public get termBreakdown(): { term1: number; term2: number; term3: number } {
    return {
      term1: this.term1Total,
      term2: this.term2Total,
      term3: this.term3Total
    };
  }

  public get mandatoryAmount(): number {
    return this._props.items.filter(i => !i.isOptional).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }

  public get dueDate(): string {
    return this._props.dueDate;
  }

  public get termPercentages(): { term1: number; term2: number; term3: number } {
    const total = this.totalAmount;
    if (total <= 0) return { term1: 0, term2: 0, term3: 0 };
    const p1 = Number(((this.term1Total / total) * 100).toFixed(1));
    const p2 = Number(((this.term2Total / total) * 100).toFixed(1));
    const p3 = Number((100 - p1 - p2).toFixed(1));
    return {
      term1: p1,
      term2: p2,
      term3: Math.max(0, p3)
    };
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
      term1Total: this.term1Total,
      term2Total: this.term2Total,
      term3Total: this.term3Total,
      termBreakdown: this.termBreakdown,
      termPercentages: this.termPercentages,
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

  public markCarriedForward(): void {
    this._props.status = InvoiceStatus.CARRIED_FORWARD;
    this._props.balance = 0;
    this.touch();
  }

  public appendFeeItem(item: FeeItem): void {
    this._props.items.push(item);
    this._props.amountBilled += item.amount;
    this._props.amountPayable += item.amount;
    this._props.balance += item.amount;
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

// 4. Expense Management & Vote Heads
export enum ExpenseCategory {
  SALARIES_WAGES = 'SALARIES_WAGES',
  CBC_LEARNING_MATERIALS = 'CBC_LEARNING_MATERIALS',
  UTILITIES_BILLS = 'UTILITIES_BILLS',
  MEALS_FEEDING = 'MEALS_FEEDING',
  REPAIRS_MAINTENANCE = 'REPAIRS_MAINTENANCE',
  TRANSPORT_FUEL = 'TRANSPORT_FUEL',
  ADMIN_OFFICE = 'ADMIN_OFFICE',
  KNEC_EXAMS = 'KNEC_EXAMS',
  CO_CURRICULAR = 'CO_CURRICULAR',
  CAPITAL_DEVELOPMENT = 'CAPITAL_DEVELOPMENT',
  OTHER_EXPENSES = 'OTHER_EXPENSES'
}

export enum ExpenseStatus {
  PAID = 'PAID',
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED'
}

export interface ExpenseProps {
  schoolId: string;
  voucherNumber: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  payee: string;
  expenseDate: string;
  status: ExpenseStatus;
  notes?: string;
  recordedByUserId: string;
  approvedByUserId?: string;
  receiptUrl?: string;
}

export class Expense extends Entity<ExpenseProps> {
  public static create(props: ExpenseProps, id: string, createdAt?: Date, updatedAt?: Date): Expense {
    return new Expense(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get voucherNumber(): string {
    return this._props.voucherNumber;
  }

  public get category(): ExpenseCategory {
    return this._props.category;
  }

  public get title(): string {
    return this._props.title;
  }

  public get amount(): number {
    return this._props.amount;
  }

  public get paymentMethod(): PaymentMethod {
    return this._props.paymentMethod;
  }

  public get paymentReference(): string {
    return this._props.paymentReference;
  }

  public get payee(): string {
    return this._props.payee;
  }

  public get expenseDate(): string {
    return this._props.expenseDate;
  }

  public get status(): ExpenseStatus {
    return this._props.status;
  }

  public get notes(): string | undefined {
    return this._props.notes;
  }

  public get recordedByUserId(): string {
    return this._props.recordedByUserId;
  }

  public get approvedByUserId(): string | undefined {
    return this._props.approvedByUserId;
  }

  public get receiptUrl(): string | undefined {
    return this._props.receiptUrl;
  }

  public setStatus(status: ExpenseStatus, approvedByUserId?: string): void {
    this._props.status = status;
    if (approvedByUserId) {
      this._props.approvedByUserId = approvedByUserId;
    }
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      voucherNumber: this.voucherNumber,
      category: this.category,
      title: this.title,
      amount: this.amount,
      paymentMethod: this.paymentMethod,
      paymentReference: this.paymentReference,
      payee: this.payee,
      expenseDate: this.expenseDate,
      status: this.status,
      notes: this.notes,
      recordedByUserId: this.recordedByUserId,
      approvedByUserId: this.approvedByUserId,
      receiptUrl: this.receiptUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// 5. Non-Fee Income Sources (Capitation, Uniform, Hire, Grants)
export enum IncomeSource {
  FEES_COLLECTION = 'FEES_COLLECTION',
  GOVERNMENT_CAPITATION_FPE = 'GOVERNMENT_CAPITATION_FPE',
  GOVERNMENT_CAPITATION_JSS = 'GOVERNMENT_CAPITATION_JSS',
  UNIFORM_SALES = 'UNIFORM_SALES',
  BUS_FACILITY_HIRE = 'BUS_FACILITY_HIRE',
  DONATIONS_GRANTS = 'DONATIONS_GRANTS',
  EXAM_REVISION_BOOKS = 'EXAM_REVISION_BOOKS',
  OTHER_INCOME = 'OTHER_INCOME'
}

export interface OtherIncomeProps {
  schoolId: string;
  receiptNumber: string;
  source: IncomeSource;
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  receivedFrom: string;
  incomeDate: string;
  notes?: string;
  recordedByUserId: string;
}

export class OtherIncome extends Entity<OtherIncomeProps> {
  public static create(props: OtherIncomeProps, id: string, createdAt?: Date, updatedAt?: Date): OtherIncome {
    return new OtherIncome(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get receiptNumber(): string {
    return this._props.receiptNumber;
  }

  public get source(): IncomeSource {
    return this._props.source;
  }

  public get title(): string {
    return this._props.title;
  }

  public get amount(): number {
    return this._props.amount;
  }

  public get paymentMethod(): PaymentMethod {
    return this._props.paymentMethod;
  }

  public get paymentReference(): string {
    return this._props.paymentReference;
  }

  public get receivedFrom(): string {
    return this._props.receivedFrom;
  }

  public get incomeDate(): string {
    return this._props.incomeDate;
  }

  public get notes(): string | undefined {
    return this._props.notes;
  }

  public get recordedByUserId(): string {
    return this._props.recordedByUserId;
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      receiptNumber: this.receiptNumber,
      source: this.source,
      title: this.title,
      amount: this.amount,
      paymentMethod: this.paymentMethod,
      paymentReference: this.paymentReference,
      receivedFrom: this.receivedFrom,
      incomeDate: this.incomeDate,
      notes: this.notes,
      recordedByUserId: this.recordedByUserId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
