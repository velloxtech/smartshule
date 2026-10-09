import { IInventoryRepository } from '../../../core/ports/repositories/IInventoryRepository';
import { InventoryItem, StockTransaction, FixedAsset } from '../../../core/domain/inventory/InventoryItem';

export class InMemoryInventoryRepository implements IInventoryRepository {
  private items: Map<string, InventoryItem> = new Map();
  private transactions: Map<string, StockTransaction> = new Map();
  private assets: Map<string, FixedAsset> = new Map();

  public async findItemById(id: string): Promise<InventoryItem | null> {
    return this.items.get(id) || null;
  }

  public async findAllItems(schoolId?: string, category?: string): Promise<InventoryItem[]> {
    let list = Array.from(this.items.values());
    if (schoolId) {
      list = list.filter(i => i.schoolId === schoolId);
    }
    if (category) {
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

  public async findAssetById(id: string): Promise<FixedAsset | null> {
    return this.assets.get(id) || null;
  }

  public async findAssets(schoolId?: string, category?: string): Promise<FixedAsset[]> {
    let list = Array.from(this.assets.values());
    if (schoolId) {
      list = list.filter(a => a.schoolId === schoolId);
    }
    if (category) {
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
