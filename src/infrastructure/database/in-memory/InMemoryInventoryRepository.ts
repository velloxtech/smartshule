import { IInventoryRepository } from '../../../core/ports/repositories/IInventoryRepository';
import {
  InventoryItem,
  InventoryPurchaseRequest,
  GoodsReceivedNote,
  SupplierInvoice,
  StockMovement,
  StockTransaction,
  FixedAsset
} from '../../../core/domain/inventory/InventoryItem';

export class InMemoryInventoryRepository implements IInventoryRepository {
  private items: Map<string, InventoryItem> = new Map();
  private purchaseRequests: Map<string, InventoryPurchaseRequest> = new Map();
  private grns: Map<string, GoodsReceivedNote> = new Map();
  private supplierInvoices: Map<string, SupplierInvoice> = new Map();
  private stockMovements: Map<string, StockMovement> = new Map();
  private transactions: Map<string, StockTransaction> = new Map();
  private assets: Map<string, FixedAsset> = new Map();

  // --- Items ---
  public async findItemById(id: string): Promise<InventoryItem | null> {
    return this.items.get(id) || null;
  }

  public async findAllItems(schoolId?: string, category?: string): Promise<InventoryItem[]> {
    let list = Array.from(this.items.values());
    if (schoolId) {
      list = list.filter(i => i.schoolId === schoolId);
    }
    if (category && category !== 'ALL') {
      list = list.filter(i => i.category === category);
    }
    return list.sort((a, b) => a.itemName.localeCompare(b.itemName));
  }

  public async saveItem(item: InventoryItem): Promise<void> {
    this.items.set(item.id, item);
  }

  public async updateItem(item: InventoryItem): Promise<void> {
    this.items.set(item.id, item);
  }

  public async deleteItem(id: string): Promise<void> {
    this.items.delete(id);
  }

  // --- Purchase Requests ---
  public async findPurchaseRequestById(id: string): Promise<InventoryPurchaseRequest | null> {
    return this.purchaseRequests.get(id) || null;
  }

  public async findPurchaseRequests(filters?: {
    schoolId?: string;
    status?: string;
    itemId?: string;
    requestedByUserId?: string;
  }): Promise<InventoryPurchaseRequest[]> {
    let list = Array.from(this.purchaseRequests.values());
    if (filters?.schoolId) {
      list = list.filter(pr => pr.schoolId === filters.schoolId);
    }
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter(pr => pr.status === filters.status);
    }
    if (filters?.itemId) {
      list = list.filter(pr => pr.itemId === filters.itemId);
    }
    if (filters?.requestedByUserId) {
      list = list.filter(pr => pr.requestedByUserId === filters.requestedByUserId);
    }
    return list.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  public async savePurchaseRequest(pr: InventoryPurchaseRequest): Promise<void> {
    this.purchaseRequests.set(pr.id, pr);
  }

  public async updatePurchaseRequest(pr: InventoryPurchaseRequest): Promise<void> {
    this.purchaseRequests.set(pr.id, pr);
  }

  // --- Goods Received Notes (GRN) ---
  public async findGrnById(id: string): Promise<GoodsReceivedNote | null> {
    return this.grns.get(id) || null;
  }

  public async findGrns(filters?: {
    schoolId?: string;
    purchaseRequestId?: string;
    itemId?: string;
  }): Promise<GoodsReceivedNote[]> {
    let list = Array.from(this.grns.values());
    if (filters?.schoolId) {
      list = list.filter(g => g.schoolId === filters.schoolId);
    }
    if (filters?.purchaseRequestId) {
      list = list.filter(g => g.purchaseRequestId === filters.purchaseRequestId);
    }
    if (filters?.itemId) {
      list = list.filter(g => g.itemId === filters.itemId);
    }
    return list.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  public async saveGrn(grn: GoodsReceivedNote): Promise<void> {
    this.grns.set(grn.id, grn);
  }

  // --- Supplier Invoices ---
  public async findSupplierInvoiceById(id: string): Promise<SupplierInvoice | null> {
    return this.supplierInvoices.get(id) || null;
  }

  public async findSupplierInvoices(filters?: {
    schoolId?: string;
    paymentStatus?: string;
    supplierName?: string;
    purchaseRequestId?: string;
  }): Promise<SupplierInvoice[]> {
    let list = Array.from(this.supplierInvoices.values());
    if (filters?.schoolId) {
      list = list.filter(inv => inv.schoolId === filters.schoolId);
    }
    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      list = list.filter(inv => inv.paymentStatus === filters.paymentStatus);
    }
    if (filters?.supplierName) {
      list = list.filter(inv =>
        inv.supplierName.toLowerCase().includes(filters.supplierName!.toLowerCase())
      );
    }
    if (filters?.purchaseRequestId) {
      list = list.filter(inv => inv.purchaseRequestId === filters.purchaseRequestId);
    }
    return list.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  public async findSupplierInvoiceByNumber(
    schoolId: string,
    supplierName: string,
    invoiceNumber: string
  ): Promise<SupplierInvoice | null> {
    const list = Array.from(this.supplierInvoices.values());
    const match = list.find(
      inv =>
        inv.schoolId === schoolId &&
        inv.supplierName.trim().toLowerCase() === supplierName.trim().toLowerCase() &&
        inv.invoiceNumber.trim().toLowerCase() === invoiceNumber.trim().toLowerCase()
    );
    return match || null;
  }

  public async saveSupplierInvoice(inv: SupplierInvoice): Promise<void> {
    this.supplierInvoices.set(inv.id, inv);
  }

  public async updateSupplierInvoice(inv: SupplierInvoice): Promise<void> {
    this.supplierInvoices.set(inv.id, inv);
  }

  // --- Stock Movements ---
  public async saveStockMovement(movement: StockMovement): Promise<void> {
    this.stockMovements.set(movement.id, movement);
  }

  public async findStockMovements(filters?: {
    schoolId?: string;
    itemId?: string;
    movementType?: string;
  }): Promise<StockMovement[]> {
    let list = Array.from(this.stockMovements.values());
    if (filters?.schoolId) {
      list = list.filter(m => m.schoolId === filters.schoolId);
    }
    if (filters?.itemId) {
      list = list.filter(m => m.itemId === filters.itemId);
    }
    if (filters?.movementType && filters.movementType !== 'ALL') {
      list = list.filter(m => m.movementType === filters.movementType);
    }
    return list.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // --- Backward-compatible Transactions ---
  public async saveTransaction(tx: StockTransaction): Promise<void> {
    this.transactions.set(tx.id, tx);
  }

  public async findTransactions(filters?: { itemId?: string; schoolId?: string }): Promise<StockTransaction[]> {
    let list = Array.from(this.transactions.values());
    if (filters?.schoolId) {
      list = list.filter(t => t.schoolId === filters.schoolId);
    }
    if (filters?.itemId) {
      list = list.filter(t => t.itemId === filters.itemId);
    }
    return list.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // --- Fixed Assets ---
  public async findAssetById(id: string): Promise<FixedAsset | null> {
    return this.assets.get(id) || null;
  }

  public async findAssets(schoolId?: string, category?: string): Promise<FixedAsset[]> {
    let list = Array.from(this.assets.values());
    if (schoolId) {
      list = list.filter(a => a.schoolId === schoolId);
    }
    if (category && category !== 'ALL') {
      list = list.filter(a => a.category === category);
    }
    return list.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  public async saveAsset(asset: FixedAsset): Promise<void> {
    this.assets.set(asset.id, asset);
  }

  public async updateAsset(asset: FixedAsset): Promise<void> {
    this.assets.set(asset.id, asset);
  }

  public async deleteAsset(id: string): Promise<void> {
    this.assets.delete(id);
  }
}
