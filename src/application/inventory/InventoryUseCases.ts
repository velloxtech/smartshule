import { IInventoryRepository } from '../../core/ports/repositories/IInventoryRepository';
import {
  InventoryItem,
  InventoryItemProps,
  StockTransaction,
  StockTransactionProps,
  FixedAsset,
  FixedAssetProps
} from '../../core/domain/inventory/InventoryItem';
import { IdGenerator, NotFoundError, ValidationError } from '../../core/domain/shared/Errors';

export interface CreateStockTransactionDTO {
  schoolId: string;
  itemId: string;
  type: 'STOCK_IN' | 'STOCK_OUT';
  quantity: number;
  issuedTo?: string; // Department, Teacher name, or Kitchen
  authorizedBy: string;
  notes?: string;
}

export class InventoryUseCases {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  // --- Consumables & Supplies Catalog ---
  public async listItems(schoolId?: string, category?: string): Promise<any[]> {
    const items = await this.inventoryRepository.findAllItems(schoolId, category);
    return items.map(item => item.toJSON());
  }

  public async addItem(props: InventoryItemProps): Promise<any> {
    if (!props.itemName || props.quantityInStock == null) {
      throw new ValidationError('Item name and initial stock quantity are required.');
    }

    const item = InventoryItem.create(props, IdGenerator.generate());
    await this.inventoryRepository.saveItem(item);
    return item.toJSON();
  }

  public async updateItem(id: string, updates: Partial<InventoryItemProps>): Promise<any> {
    const item = await this.inventoryRepository.findItemById(id);
    if (!item) throw new NotFoundError('Inventory item not found.');

    item.updateDetails(updates);
    await this.inventoryRepository.updateItem(item);
    return item.toJSON();
  }

  public async deleteItem(id: string): Promise<void> {
    const item = await this.inventoryRepository.findItemById(id);
    if (!item) throw new NotFoundError('Inventory item not found.');
    await this.inventoryRepository.deleteItem(id);
  }

  // --- Stock In / Stock Out Requisitions ---
  public async recordStockTransaction(dto: CreateStockTransactionDTO): Promise<any> {
    const item = await this.inventoryRepository.findItemById(dto.itemId);
    if (!item) throw new NotFoundError('Inventory item not found.');

    if (dto.quantity <= 0) {
      throw new ValidationError('Quantity must be greater than zero.');
    }

    if (dto.type === 'STOCK_IN') {
      item.addStock(dto.quantity);
    } else {
      item.issueStock(dto.quantity);
    }

    await this.inventoryRepository.updateItem(item);

    const now = new Date();
    const transaction = StockTransaction.create(
      {
        schoolId: dto.schoolId,
        itemId: dto.itemId,
        itemName: item.itemName,
        type: dto.type,
        quantity: dto.quantity,
        issuedTo: dto.issuedTo,
        authorizedBy: dto.authorizedBy,
        date: now.toISOString().split('T')[0],
        notes: dto.notes
      },
      IdGenerator.generate()
    );

    await this.inventoryRepository.saveTransaction(transaction);

    return {
      transaction: transaction.toJSON(),
      item: item.toJSON()
    };
  }

  public async listTransactions(filters?: { itemId?: string; schoolId?: string }): Promise<any[]> {
    const txs = await this.inventoryRepository.findTransactions(filters);
    return txs.map(t => t.toJSON());
  }

  public async getLowStockAlerts(schoolId?: string): Promise<any[]> {
    const items = await this.inventoryRepository.findAllItems(schoolId);
    return items
      .filter(i => i.isLowStock)
      .map(i => i.toJSON());
  }

  // --- Fixed Assets ---
  public async listAssets(schoolId?: string, category?: string): Promise<any[]> {
    const assets = await this.inventoryRepository.findAssets(schoolId, category);
    return assets.map(a => a.toJSON());
  }

  public async addAsset(props: FixedAssetProps): Promise<any> {
    if (!props.assetName || !props.assetTag) {
      throw new ValidationError('Asset name and asset tag are required.');
    }

    const asset = FixedAsset.create(props, IdGenerator.generate());
    await this.inventoryRepository.saveAsset(asset);
    return asset.toJSON();
  }

  public async updateAsset(id: string, updates: Partial<FixedAssetProps>): Promise<any> {
    const asset = await this.inventoryRepository.findAssetById(id);
    if (!asset) throw new NotFoundError('Fixed asset not found.');

    asset.updateDetails(updates);
    await this.inventoryRepository.updateAsset(asset);
    return asset.toJSON();
  }

  public async deleteAsset(id: string): Promise<void> {
    const asset = await this.inventoryRepository.findAssetById(id);
    if (!asset) throw new NotFoundError('Fixed asset not found.');
    await this.inventoryRepository.deleteAsset(id);
  }

  public async getInventoryStats(schoolId?: string) {
    const items = await this.inventoryRepository.findAllItems(schoolId);
    const assets = await this.inventoryRepository.findAssets(schoolId);

    const totalSuppliesValue = items.reduce((acc, cur) => acc + (cur.quantityInStock * cur.unitCost), 0);
    const lowStockCount = items.filter(i => i.isLowStock).length;
    const totalAssetsValue = assets.reduce((acc, cur) => acc + cur.purchaseCost, 0);

    return {
      totalItemsCount: items.length,
      lowStockCount,
      totalSuppliesValue,
      totalAssetsCount: assets.length,
      totalAssetsValue
    };
  }
}
