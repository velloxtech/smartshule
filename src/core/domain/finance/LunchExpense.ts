import { Entity } from '../shared/Entity';
import { PaymentMethod } from './Fee';

export enum LunchExpenseCategory {
  FOOD_CEREALS = 'FOOD_CEREALS',               // Rice, Beans, Maize, Flour, Cooking Oil, Salt, Sugar
  FRESH_PRODUCE = 'FRESH_PRODUCE',             // Vegetables, Kales, Cabbage, Tomatoes, Onions, Potatoes, Fruits
  MEAT_DAIRY = 'MEAT_DAIRY',                   // Beef, Chicken, Fish, Eggs, Milk
  COOKING_FUEL = 'COOKING_FUEL',               // Firewood, Charcoal, LPG Cooking Gas, Biogas
  KITCHEN_STAFF_WAGES = 'KITCHEN_STAFF_WAGES', // Head Cook, Assistant Cooks, Kitchen Staff, Dishwashers
  EQUIPMENT_UTENSILS = 'EQUIPMENT_UTENSILS',   // Sufurias, Plates, Spoons, Gas Burners, Kitchen Maintenance
  TRANSPORT_DELIVERY = 'TRANSPORT_DELIVERY',   // Market transit, Vehicle hire for bulk supplies delivery
  WATER_SANITATION = 'WATER_SANITATION',       // Clean water supply, Dish soap, Cleaning supplies, Disinfectants
  OTHER_EXPENSES = 'OTHER_EXPENSES'            // Emergency supplies, Sundry kitchen expenses
}

export interface LunchExpenseProps {
  schoolId: string;
  title: string;
  category: LunchExpenseCategory;
  amount: number;
  expenseDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod | string; // CASH, MPESA, BANK_TRANSFER, CHEQUE
  paymentReference?: string; // M-Pesa ref, Bank slip, Cheque #
  vendorPayee: string; // Supplier / Vendor / Payee
  receiptVoucherNumber?: string; // Voucher # or vendor receipt #
  termId?: string; // e.g. "TERM_1", "TERM_2", "TERM_3"
  academicYearId?: string; // e.g. "2026"
  recordedByUserId?: string;
  recordedByUserName?: string;
  notes?: string;
  receiptUrl?: string;
}

export class LunchExpense extends Entity<LunchExpenseProps> {
  public static create(
    props: LunchExpenseProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): LunchExpense {
    return new LunchExpense(
      {
        ...props,
        amount: Number(props.amount) || 0
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get title(): string {
    return this._props.title;
  }

  public get category(): LunchExpenseCategory {
    return this._props.category;
  }

  public get amount(): number {
    return this._props.amount;
  }

  public get expenseDate(): string {
    return this._props.expenseDate;
  }

  public get paymentMethod(): PaymentMethod | string {
    return this._props.paymentMethod;
  }

  public get paymentReference(): string | undefined {
    return this._props.paymentReference;
  }

  public get vendorPayee(): string {
    return this._props.vendorPayee;
  }

  public get receiptVoucherNumber(): string | undefined {
    return this._props.receiptVoucherNumber;
  }

  public get termId(): string | undefined {
    return this._props.termId;
  }

  public get academicYearId(): string | undefined {
    return this._props.academicYearId;
  }

  public get recordedByUserId(): string | undefined {
    return this._props.recordedByUserId;
  }

  public get recordedByUserName(): string | undefined {
    return this._props.recordedByUserName;
  }

  public get notes(): string | undefined {
    return this._props.notes;
  }

  public get receiptUrl(): string | undefined {
    return this._props.receiptUrl;
  }

  public updateDetails(updates: Partial<LunchExpenseProps>): void {
    if (updates.title !== undefined) this._props.title = updates.title;
    if (updates.category !== undefined) this._props.category = updates.category;
    if (updates.amount !== undefined) this._props.amount = Number(updates.amount);
    if (updates.expenseDate !== undefined) this._props.expenseDate = updates.expenseDate;
    if (updates.paymentMethod !== undefined) this._props.paymentMethod = updates.paymentMethod;
    if (updates.paymentReference !== undefined) this._props.paymentReference = updates.paymentReference;
    if (updates.vendorPayee !== undefined) this._props.vendorPayee = updates.vendorPayee;
    if (updates.receiptVoucherNumber !== undefined) this._props.receiptVoucherNumber = updates.receiptVoucherNumber;
    if (updates.termId !== undefined) this._props.termId = updates.termId;
    if (updates.academicYearId !== undefined) this._props.academicYearId = updates.academicYearId;
    if (updates.notes !== undefined) this._props.notes = updates.notes;
    if (updates.receiptUrl !== undefined) this._props.receiptUrl = updates.receiptUrl;

    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      title: this.title,
      category: this.category,
      amount: this.amount,
      expenseDate: this.expenseDate,
      paymentMethod: this.paymentMethod,
      paymentReference: this.paymentReference,
      vendorPayee: this.vendorPayee,
      receiptVoucherNumber: this.receiptVoucherNumber,
      termId: this.termId,
      academicYearId: this.academicYearId,
      recordedByUserId: this.recordedByUserId,
      recordedByUserName: this.recordedByUserName,
      notes: this.notes,
      receiptUrl: this.receiptUrl,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
