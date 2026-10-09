import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InventoryUseCases } from '../../../application/inventory/InventoryUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const CreateInventoryItemSchema = z.object({
  itemName: z.string().min(1),
  category: z.enum(['STATIONERY', 'TEXTBOOKS', 'LAB_EQUIPMENT', 'KITCHEN_FOOD', 'CLEANING', 'UNIFORMS']),
  unit: z.string().min(1),
  quantityInStock: z.number().min(0),
  reorderLevel: z.number().min(0),
  unitCost: z.number().min(0),
  supplier: z.string().optional(),
  notes: z.string().optional()
});

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial();

export const RecordStockTxSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(['STOCK_IN', 'STOCK_OUT']),
  quantity: z.number().min(1),
  issuedTo: z.string().optional(),
  notes: z.string().optional()
});

export const CreateFixedAssetSchema = z.object({
  assetName: z.string().min(1),
  assetTag: z.string().min(1),
  category: z.enum(['FURNITURE_DESKS', 'COMPUTERS_IT', 'LAB_APPARATUS', 'SPORTS_EQUIPMENT', 'AUDIO_VISUAL']),
  purchaseDate: z.string().min(10),
  purchaseCost: z.number().min(0),
  location: z.string().min(1),
  condition: z.enum(['EXCELLENT', 'GOOD', 'NEEDS_REPAIR', 'DAMAGED']).default('EXCELLENT'),
  assignedTo: z.string().optional()
});

export const UpdateFixedAssetSchema = CreateFixedAssetSchema.partial();

export class InventoryController {
  constructor(private readonly inventoryUseCases: InventoryUseCases) {}

  public listItems = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;
      const schoolId = req.user?.schoolId;
      const items = await this.inventoryUseCases.listItems(schoolId, category);
      return res.status(200).json({
        success: true,
        count: items.length,
        data: items
      });
    } catch (err) {
      next(err);
    }
  };

  public createItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const item = await this.inventoryUseCases.addItem({
        ...req.body,
        schoolId
      });
      return res.status(201).json({
        success: true,
        message: 'Inventory item added to stores catalog',
        data: item
      });
    } catch (err) {
      next(err);
    }
  };

  public updateItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await this.inventoryUseCases.updateItem(req.params.id as string, req.body);
      return res.status(200).json({
        success: true,
        message: 'Inventory item updated',
        data: item
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.inventoryUseCases.deleteItem(req.params.id as string);
      return res.status(200).json({
        success: true,
        message: 'Inventory item removed'
      });
    } catch (err) {
      next(err);
    }
  };

  public recordTransaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const authorizedBy = req.user?.email || 'Storekeeper';
      const result = await this.inventoryUseCases.recordStockTransaction({
        ...req.body,
        schoolId,
        authorizedBy
      });
      return res.status(201).json({
        success: true,
        message: req.body.type === 'STOCK_IN' ? 'Stock received successfully' : 'Stock issued successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public listTransactions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const itemId = req.query.itemId as string | undefined;
      const schoolId = req.user?.schoolId;
      const txs = await this.inventoryUseCases.listTransactions({ itemId, schoolId });
      return res.status(200).json({
        success: true,
        count: txs.length,
        data: txs
      });
    } catch (err) {
      next(err);
    }
  };

  public getLowStockAlerts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId;
      const alerts = await this.inventoryUseCases.getLowStockAlerts(schoolId);
      return res.status(200).json({
        success: true,
        count: alerts.length,
        data: alerts
      });
    } catch (err) {
      next(err);
    }
  };

  public listAssets = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;
      const schoolId = req.user?.schoolId;
      const assets = await this.inventoryUseCases.listAssets(schoolId, category);
      return res.status(200).json({
        success: true,
        count: assets.length,
        data: assets
      });
    } catch (err) {
      next(err);
    }
  };

  public createAsset = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const asset = await this.inventoryUseCases.addAsset({
        ...req.body,
        schoolId
      });
      return res.status(201).json({
        success: true,
        message: 'Fixed asset tagged and registered',
        data: asset
      });
    } catch (err) {
      next(err);
    }
  };

  public updateAsset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = await this.inventoryUseCases.updateAsset(req.params.id as string, req.body);
      return res.status(200).json({
        success: true,
        message: 'Fixed asset updated',
        data: asset
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteAsset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.inventoryUseCases.deleteAsset(req.params.id as string);
      return res.status(200).json({
        success: true,
        message: 'Fixed asset deleted'
      });
    } catch (err) {
      next(err);
    }
  };

  public getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId;
      const stats = await this.inventoryUseCases.getInventoryStats(schoolId);
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  };
}
