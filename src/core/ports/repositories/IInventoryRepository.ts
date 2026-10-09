import { InventoryItem, StockTransaction, FixedAsset } from '../../domain/inventory/InventoryItem';

export interface IInventoryRepository {
  findItemById(id: string): Promise<InventoryItem | null>;
  findAllItems(schoolId?: string, category?: string): Promise<InventoryItem[]>;
  saveItem(item: InventoryItem): Promise<void>;
  updateItem(item: InventoryItem): Promise<void>;
  deleteItem(id: string): Promise<void>;

  saveTransaction(tx: StockTransaction): Promise<void>;
  findTransactions(filters?: { itemId?: string; schoolId?: string }): Promise<StockTransaction[]>;

  findAssetById(id: string): Promise<FixedAsset | null>;
  findAssets(schoolId?: string, category?: string): Promise<FixedAsset[]>;
  saveAsset(asset: FixedAsset): Promise<void>;
  updateAsset(asset: FixedAsset): Promise<void>;
  deleteAsset(id: string): Promise<void>;
}
