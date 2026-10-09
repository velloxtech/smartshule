import { Entity } from '../shared/Entity';

export interface InventoryItemProps {
  schoolId: string;
  itemName: string;
  category: 'STATIONERY' | 'TEXTBOOKS' | 'LAB_EQUIPMENT' | 'KITCHEN_FOOD' | 'CLEANING' | 'UNIFORMS';
  unit: string; // e.g. "Boxes", "Pieces", "Bags (90kg)", "Litres"
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
  public get category(): string { return this._props.category; }
  public get unitCost(): number { return this._props.unitCost; }
  public get quantityInStock(): number { return this._props.quantityInStock; }
  public get reorderLevel(): number { return this._props.reorderLevel; }
  public get isLowStock(): boolean { return this._props.quantityInStock <= this._props.reorderLevel; }

  public addStock(quantity: number): void {
    this._props.quantityInStock += quantity;
    this.touch();
  }

  public issueStock(quantity: number): void {
    if (quantity > this._props.quantityInStock) {
      throw new Error(`Insufficient stock for ${this._props.itemName}. Available: ${this._props.quantityInStock}, Requested: ${quantity}`);
    }
    this._props.quantityInStock -= quantity;
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

export interface StockTransactionProps {
  schoolId: string;
  itemId: string;
  itemName: string;
  type: 'STOCK_IN' | 'STOCK_OUT';
  quantity: number;
  issuedTo?: string; // Teacher name, Kitchen, or Department
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

export interface FixedAssetProps {
  schoolId: string;
  assetName: string;
  assetTag: string; // e.g. "GSS-DESK-042", "GSS-LAB-012"
  category: 'FURNITURE_DESKS' | 'COMPUTERS_IT' | 'LAB_APPARATUS' | 'SPORTS_EQUIPMENT' | 'AUDIO_VISUAL';
  purchaseDate: string;
  purchaseCost: number;
  location: string; // e.g. "Grade 4 East", "Science Lab", "Staff Room"
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
