import { Entity } from '../shared/Entity';

export type InventoryCategory =
  | 'STATIONERY'
  | 'TEXTBOOKS'
  | 'LAB_EQUIPMENT'
  | 'KITCHEN_FOOD'
  | 'CLEANING'
  | 'UNIFORMS'
  | 'GENERAL_SUPPLIES';

export interface InventoryItemProps {
  schoolId: string;
  itemName: string;
  category: InventoryCategory;
  unit: string; // e.g. "Boxes", "Pieces", "Bags (90kg)", "Litres", "Reams"
  quantityInStock: number;
  reorderLevel: number;
  unitCost: number;
  supplier?: string;
  notes?: string;
}

export class InventoryItem extends Entity<InventoryItemProps> {
  public static create(props: InventoryItemProps, id: string, createdAt?: Date, updatedAt?: Date): InventoryItem {
    return new InventoryItem(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get itemName(): string { return this._props.itemName; }
  public get category(): InventoryCategory { return this._props.category; }
  public get unit(): string { return this._props.unit; }
  public get unitCost(): number { return this._props.unitCost; }
  public get quantityInStock(): number { return this._props.quantityInStock; }
  public get reorderLevel(): number { return this._props.reorderLevel; }
  public get supplier(): string | undefined { return this._props.supplier; }
  public get notes(): string | undefined { return this._props.notes; }
  public get isLowStock(): boolean { return this._props.quantityInStock <= this._props.reorderLevel; }

  public addStock(quantity: number): void {
    if (quantity <= 0) throw new Error('Quantity to add must be positive');
    this._props.quantityInStock = Math.round((this._props.quantityInStock + quantity) * 100) / 100;
    this.touch();
  }

  public issueStock(quantity: number): void {
    if (quantity <= 0) throw new Error('Quantity to issue must be positive');
    if (quantity > this._props.quantityInStock) {
      throw new Error(`Insufficient stock for ${this._props.itemName}. Available: ${this._props.quantityInStock}, Requested: ${quantity}`);
    }
    this._props.quantityInStock = Math.round((this._props.quantityInStock - quantity) * 100) / 100;
    this.touch();
  }

  public adjustStock(newQuantity: number): void {
    if (newQuantity < 0) throw new Error('Stock balance cannot be negative');
    this._props.quantityInStock = Math.round(newQuantity * 100) / 100;
    this.touch();
  }

  public updateDetails(updates: Partial<InventoryItemProps>): void {
    Object.assign(this._props, updates);
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      ...this._props,
      isLowStock: this.isLowStock,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ==========================================
// INVENTORY PURCHASE REQUEST
// ==========================================
export type PurchaseRequestStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ORDERED'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface InventoryPurchaseRequestProps {
  schoolId: string;
  requestNumber: string; // e.g. "PR-2026-0001"
  itemId: string;
  itemName: string;
  category: string;
  quantityRequested: number;
  estimatedUnitCost: number;
  totalEstimatedCost: number;
  requestedByUserId: string;
  requestedByName: string;
  requestedByEmail?: string;
  reason: string;
  supportingDocumentUrl?: string;
  status: PurchaseRequestStatus;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: Date;
  approvalNotes?: string;
  rejectionReason?: string;
  deliveredQuantity: number;
  supplierName?: string;
}

export class InventoryPurchaseRequest extends Entity<InventoryPurchaseRequestProps> {
  public static create(props: InventoryPurchaseRequestProps, id: string, createdAt?: Date, updatedAt?: Date): InventoryPurchaseRequest {
    return new InventoryPurchaseRequest(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get requestNumber(): string { return this._props.requestNumber; }
  public get itemId(): string { return this._props.itemId; }
  public get itemName(): string { return this._props.itemName; }
  public get category(): string { return this._props.category; }
  public get quantityRequested(): number { return this._props.quantityRequested; }
  public get estimatedUnitCost(): number { return this._props.estimatedUnitCost; }
  public get totalEstimatedCost(): number { return this._props.totalEstimatedCost; }
  public get requestedByUserId(): string { return this._props.requestedByUserId; }
  public get requestedByName(): string { return this._props.requestedByName; }
  public get requestedByEmail(): string | undefined { return this._props.requestedByEmail; }
  public get reason(): string { return this._props.reason; }
  public get supportingDocumentUrl(): string | undefined { return this._props.supportingDocumentUrl; }
  public get status(): PurchaseRequestStatus { return this._props.status; }
  public get approvedByUserId(): string | undefined { return this._props.approvedByUserId; }
  public get approvedByName(): string | undefined { return this._props.approvedByName; }
  public get approvedAt(): Date | undefined { return this._props.approvedAt; }
  public get approvalNotes(): string | undefined { return this._props.approvalNotes; }
  public get rejectionReason(): string | undefined { return this._props.rejectionReason; }
  public get deliveredQuantity(): number { return this._props.deliveredQuantity; }
  public get supplierName(): string | undefined { return this._props.supplierName; }
  public get outstandingQuantity(): number {
    return Math.max(0, this._props.quantityRequested - this._props.deliveredQuantity);
  }

  public approve(userId: string, userName: string, notes?: string): void {
    if (this._props.status !== 'REQUESTED') {
      throw new Error(`Cannot approve request in status ${this._props.status}.`);
    }
    this._props.status = 'APPROVED';
    this._props.approvedByUserId = userId;
    this._props.approvedByName = userName;
    this._props.approvedAt = new Date();
    if (notes) this._props.approvalNotes = notes;
    this.touch();
  }

  public reject(userId: string, userName: string, reason: string): void {
    if (this._props.status !== 'REQUESTED') {
      throw new Error(`Cannot reject request in status ${this._props.status}.`);
    }
    this._props.status = 'REJECTED';
    this._props.approvedByUserId = userId;
    this._props.approvedByName = userName;
    this._props.approvedAt = new Date();
    this._props.rejectionReason = reason;
    this.touch();
  }

  public recordDelivery(acceptedQuantity: number): void {
    this._props.deliveredQuantity = Math.round((this._props.deliveredQuantity + acceptedQuantity) * 100) / 100;
    if (this._props.deliveredQuantity >= this._props.quantityRequested) {
      this._props.status = 'DELIVERED';
    } else {
      this._props.status = 'PARTIALLY_DELIVERED';
    }
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      ...this._props,
      outstandingQuantity: this.outstandingQuantity,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ==========================================
// GOODS RECEIVED NOTE (GRN)
// ==========================================
export interface GoodsReceivedNoteProps {
  schoolId: string;
  grnNumber: string; // e.g. "GRN-2026-0001"
  purchaseRequestId: string;
  itemId: string;
  itemName: string;
  deliveryNoteRef?: string;
  quantityOrdered: number;
  quantityDelivered: number;
  quantityAccepted: number;
  quantityRejected: number;
  rejectionReason?: string;
  receivedByUserId: string;
  receivedByName: string;
  receivedDate: string;
  deliveryStatus: 'FULL' | 'PARTIAL' | 'REJECTED';
  notes?: string;
}

export class GoodsReceivedNote extends Entity<GoodsReceivedNoteProps> {
  public static create(props: GoodsReceivedNoteProps, id: string, createdAt?: Date, updatedAt?: Date): GoodsReceivedNote {
    return new GoodsReceivedNote(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get grnNumber(): string { return this._props.grnNumber; }
  public get purchaseRequestId(): string { return this._props.purchaseRequestId; }
  public get itemId(): string { return this._props.itemId; }
  public get itemName(): string { return this._props.itemName; }
  public get quantityOrdered(): number { return this._props.quantityOrdered; }
  public get quantityDelivered(): number { return this._props.quantityDelivered; }
  public get quantityAccepted(): number { return this._props.quantityAccepted; }
  public get quantityRejected(): number { return this._props.quantityRejected; }
  public get receivedByUserId(): string { return this._props.receivedByUserId; }
  public get receivedByName(): string { return this._props.receivedByName; }
  public get receivedDate(): string { return this._props.receivedDate; }
  public get deliveryStatus(): string { return this._props.deliveryStatus; }

  public toJSON() {
    return {
      id: this.id,
      ...this._props,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ==========================================
// SUPPLIER INVOICE & ACCOUNTS PAYABLE
// ==========================================
export type SupplierInvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REVERSED';

export interface SupplierInvoiceProps {
  schoolId: string;
  supplierName: string;
  invoiceNumber: string;
  purchaseRequestId?: string;
  invoiceDate: string;
  dueDate?: string;
  totalAmount: number;
  taxAmount: number;
  amountPaid: number;
  balance: number;
  paymentStatus: SupplierInvoiceStatus;
  fundingAccount?: 'BANK' | 'MPESA' | 'CASH' | 'CHEQUE';
  expenseId?: string;
  voucherNumber?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidByUserId?: string;
  paidAt?: Date;
  verifiedByUserId?: string;
  verifiedAt?: Date;
  documentUrl?: string;
  notes?: string;
}

export class SupplierInvoice extends Entity<SupplierInvoiceProps> {
  public static create(props: SupplierInvoiceProps, id: string, createdAt?: Date, updatedAt?: Date): SupplierInvoice {
    return new SupplierInvoice(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get supplierName(): string { return this._props.supplierName; }
  public get invoiceNumber(): string { return this._props.invoiceNumber; }
  public get purchaseRequestId(): string | undefined { return this._props.purchaseRequestId; }
  public get invoiceDate(): string { return this._props.invoiceDate; }
  public get totalAmount(): number { return this._props.totalAmount; }
  public get amountPaid(): number { return this._props.amountPaid; }
  public get balance(): number { return this._props.balance; }
  public get paymentStatus(): SupplierInvoiceStatus { return this._props.paymentStatus; }
  public get voucherNumber(): string | undefined { return this._props.voucherNumber; }
  public get expenseId(): string | undefined { return this._props.expenseId; }
  public get fundingAccount(): string | undefined { return this._props.fundingAccount; }

  public recordPayment(
    amount: number,
    method: string,
    ref: string,
    fundingAccount: 'BANK' | 'MPESA' | 'CASH' | 'CHEQUE',
    expenseId: string,
    voucherNumber: string,
    userId: string,
    paidAt?: Date
  ): void {
    if (amount <= 0) throw new Error('Payment amount must be greater than zero.');
    if (amount > this._props.balance) {
      throw new Error(`Payment amount (KES ${amount}) exceeds outstanding payable balance (KES ${this._props.balance}).`);
    }

    this._props.amountPaid = Math.round((this._props.amountPaid + amount) * 100) / 100;
    this._props.balance = Math.round((this._props.totalAmount - this._props.amountPaid) * 100) / 100;

    if (this._props.balance <= 0) {
      this._props.balance = 0;
      this._props.paymentStatus = 'PAID';
    } else {
      this._props.paymentStatus = 'PARTIALLY_PAID';
    }

    this._props.paymentMethod = method;
    this._props.paymentReference = ref;
    this._props.fundingAccount = fundingAccount;
    this._props.expenseId = expenseId;
    this._props.voucherNumber = voucherNumber;
    this._props.paidByUserId = userId;
    this._props.paidAt = paidAt || new Date();
    this.touch();
  }

  public reversePayment(reason: string, userId: string): void {
    if (this._props.amountPaid <= 0 && this._props.paymentStatus === 'UNPAID') {
      throw new Error('Invoice has no recorded payments to reverse.');
    }
    this._props.amountPaid = 0;
    this._props.balance = this._props.totalAmount;
    this._props.paymentStatus = 'UNPAID';
    this._props.notes = `${this._props.notes ? `${this._props.notes} | ` : ''}Payment reversed by user ${userId}. Reason: ${reason}`;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      ...this._props,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ==========================================
// IMMUTABLE STOCK MOVEMENT AUDIT TRAIL
// ==========================================
export type StockMovementType =
  | 'GOODS_RECEIVED'
  | 'STOCK_ISSUE'
  | 'STOCK_ADJUSTMENT'
  | 'DAMAGED_LOST'
  | 'DISPOSAL';

export interface StockMovementProps {
  schoolId: string;
  itemId: string;
  itemName: string;
  movementType: StockMovementType;
  quantity: number; // positive or negative
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string; // GRN ID, Requisition ID, or Disposal Order ID
  referenceType?: string;
  issuedTo?: string; // Teacher name, Kitchen, or Department
  purpose?: string;
  reason: string;
  recordedByUserId: string;
  recordedByName: string;
  authorizedByUserId: string;
  authorizedByName: string;
  date: string;
}

export class StockMovement extends Entity<StockMovementProps> {
  public static create(props: StockMovementProps, id: string, createdAt?: Date, updatedAt?: Date): StockMovement {
    return new StockMovement(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get itemId(): string { return this._props.itemId; }
  public get movementType(): StockMovementType { return this._props.movementType; }
  public get quantity(): number { return this._props.quantity; }
  public get balanceBefore(): number { return this._props.balanceBefore; }
  public get balanceAfter(): number { return this._props.balanceAfter; }

  public toJSON() {
    return {
      id: this.id,
      ...this._props,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ==========================================
// BACKWARD COMPATIBLE STOCK TRANSACTION
// ==========================================
export interface StockTransactionProps {
  schoolId: string;
  itemId: string;
  itemName: string;
  type: 'STOCK_IN' | 'STOCK_OUT';
  quantity: number;
  issuedTo?: string;
  authorizedBy: string;
  date: string;
  notes?: string;
}

export class StockTransaction extends Entity<StockTransactionProps> {
  public static create(props: StockTransactionProps, id: string, createdAt?: Date, updatedAt?: Date): StockTransaction {
    return new StockTransaction(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get itemId(): string { return this._props.itemId; }

  public toJSON() {
    return {
      id: this.id,
      ...this._props,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ==========================================
// FIXED ASSETS
// ==========================================
export interface FixedAssetProps {
  schoolId: string;
  assetName: string;
  assetTag: string; // e.g. "GSS-DESK-042", "GSS-LAB-012"
  category: 'FURNITURE_DESKS' | 'COMPUTERS_IT' | 'LAB_APPARATUS' | 'SPORTS_EQUIPMENT' | 'AUDIO_VISUAL';
  purchaseDate: string;
  purchaseCost: number;
  location: string;
  condition: 'EXCELLENT' | 'GOOD' | 'NEEDS_REPAIR' | 'DAMAGED';
  assignedTo?: string;
}

export class FixedAsset extends Entity<FixedAssetProps> {
  public static create(props: FixedAssetProps, id: string, createdAt?: Date, updatedAt?: Date): FixedAsset {
    return new FixedAsset(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get category(): string { return this._props.category; }
  public get purchaseCost(): number { return this._props.purchaseCost; }

  public updateCondition(condition: 'EXCELLENT' | 'GOOD' | 'NEEDS_REPAIR' | 'DAMAGED', location?: string): void {
    this._props.condition = condition;
    if (location) this._props.location = location;
    this.touch();
  }

  public updateDetails(updates: Partial<FixedAssetProps>): void {
    Object.assign(this._props, updates);
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      ...this._props,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
