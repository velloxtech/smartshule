import {
  InventoryItem,
  InventoryPurchaseRequest,
  GoodsReceivedNote,
  SupplierInvoice,
  StockMovement,
  StockTransaction,
  FixedAsset
} from '../../domain/inventory/InventoryItem';

export interface IInventoryRepository {
  // Inventory Items
  findItemById(id: string): Promise<InventoryItem | null>;
  findAllItems(schoolId?: string, category?: string): Promise<InventoryItem[]>;
  saveItem(item: InventoryItem): Promise<void>;
  updateItem(item: InventoryItem): Promise<void>;
  deleteItem(id: string): Promise<void>;

  // Purchase Requests
  findPurchaseRequestById(id: string): Promise<InventoryPurchaseRequest | null>;
  findPurchaseRequests(filters?: {
    schoolId?: string;
    status?: string;
    itemId?: string;
    requestedByUserId?: string;
  }): Promise<InventoryPurchaseRequest[]>;
  savePurchaseRequest(pr: InventoryPurchaseRequest): Promise<void>;
  updatePurchaseRequest(pr: InventoryPurchaseRequest): Promise<void>;

  // Goods Received Notes (GRN)
  findGrnById(id: string): Promise<GoodsReceivedNote | null>;
  findGrns(filters?: {
    schoolId?: string;
    purchaseRequestId?: string;
    itemId?: string;
  }): Promise<GoodsReceivedNote[]>;
  saveGrn(grn: GoodsReceivedNote): Promise<void>;

  // Supplier Invoices & Accounts Payable
  findSupplierInvoiceById(id: string): Promise<SupplierInvoice | null>;
  findSupplierInvoices(filters?: {
    schoolId?: string;
    paymentStatus?: string;
    supplierName?: string;
    purchaseRequestId?: string;
  }): Promise<SupplierInvoice[]>;
  findSupplierInvoiceByNumber(
    schoolId: string,
    supplierName: string,
    invoiceNumber: string
  ): Promise<SupplierInvoice | null>;
  saveSupplierInvoice(inv: SupplierInvoice): Promise<void>;
  updateSupplierInvoice(inv: SupplierInvoice): Promise<void>;

  // Stock Movements & Audit Trail
  saveStockMovement(movement: StockMovement): Promise<void>;
  findStockMovements(filters?: {
    schoolId?: string;
    itemId?: string;
    movementType?: string;
  }): Promise<StockMovement[]>;

  // Backward-compatible Stock Transactions
  saveTransaction(tx: StockTransaction): Promise<void>;
  findTransactions(filters?: { itemId?: string; schoolId?: string }): Promise<StockTransaction[]>;

  // Fixed Assets
  findAssetById(id: string): Promise<FixedAsset | null>;
  findAssets(schoolId?: string, category?: string): Promise<FixedAsset[]>;
  saveAsset(asset: FixedAsset): Promise<void>;
  updateAsset(asset: FixedAsset): Promise<void>;
  deleteAsset(id: string): Promise<void>;
}
