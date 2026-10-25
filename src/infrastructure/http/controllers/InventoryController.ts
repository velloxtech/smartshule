import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InventoryUseCases, RequestingUser } from '../../../application/inventory/InventoryUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const CreateInventoryItemSchema = z.object({
  itemName: z.string().min(1),
  category: z.enum(['STATIONERY', 'TEXTBOOKS', 'LAB_EQUIPMENT', 'KITCHEN_FOOD', 'CLEANING', 'UNIFORMS', 'GENERAL_SUPPLIES']),
  unit: z.string().min(1),
  quantityInStock: z.number().min(0),
  reorderLevel: z.number().min(0).default(10),
  unitCost: z.number().min(0),
  supplier: z.string().optional(),
  notes: z.string().optional()
});

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial();

export const CreatePurchaseRequestSchema = z.object({
  itemId: z.string().min(1),
  quantityRequested: z.number().positive(),
  estimatedUnitCost: z.number().positive(),
  reason: z.string().min(1),
  supportingDocumentUrl: z.string().optional(),
  supplierName: z.string().optional()
});

export const ApprovePurchaseRequestSchema = z.object({
  notes: z.string().optional()
});

export const RejectPurchaseRequestSchema = z.object({
  reason: z.string().min(1)
});

export const ReceiveGoodsSchema = z.object({
  purchaseRequestId: z.string().min(1),
  quantityDelivered: z.number().min(0),
  quantityAccepted: z.number().min(0),
  quantityRejected: z.number().min(0).optional(),
  rejectionReason: z.string().optional(),
  deliveryNoteRef: z.string().optional(),
  receivedDate: z.string().optional(),
  notes: z.string().optional()
});

export const RecordSupplierInvoiceSchema = z.object({
  supplierName: z.string().min(1),
  invoiceNumber: z.string().min(1),
  purchaseRequestId: z.string().optional(),
  invoiceDate: z.string().min(1),
  dueDate: z.string().optional(),
  totalAmount: z.number().positive(),
  taxAmount: z.number().min(0).optional(),
  documentUrl: z.string().optional(),
  notes: z.string().optional()
});

export const DisburseSupplierPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(['BANK', 'MPESA', 'CASH', 'CHEQUE']),
  paymentReference: z.string().min(1),
  fundingAccount: z.enum(['BANK', 'MPESA', 'CASH', 'CHEQUE']),
  voucherNumber: z.string().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional()
});

export const ReverseSupplierPaymentSchema = z.object({
  reason: z.string().min(1)
});

export const StockIssueSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  issuedTo: z.string().min(1),
  purpose: z.string().optional(),
  reason: z.string().min(1),
  date: z.string().optional()
});

export const StockAdjustmentSchema = z.object({
  itemId: z.string().min(1),
  newQuantity: z.number().min(0),
  reason: z.string().min(1),
  date: z.string().optional()
});

export const StockDisposalSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  isDamagedLost: z.boolean().optional(),
  reason: z.string().min(1),
  disposalOrderRef: z.string().optional(),
  date: z.string().optional()
});

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

  private extractUser(req: AuthenticatedRequest): RequestingUser {
    return {
      userId: req.user?.userId || 'usr-system',
      name: req.user?.email ? req.user.email.split('@')[0] : 'Authorized User',
      email: req.user?.email,
      role: req.user?.role || 'ADMIN'
    };
  }

  // ==========================================
  // 1. ITEMS CATALOG
  // ==========================================
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

  public getItemById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const item = await this.inventoryUseCases.getItemById(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: item
      });
    } catch (err) {
      next(err);
    }
  };

  public createItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const user = this.extractUser(req);
      const item = await this.inventoryUseCases.addItem(
        {
          ...req.body,
          schoolId
        },
        user
      );
      return res.status(201).json({
        success: true,
        message: 'Inventory item added to stores catalog',
        data: item
      });
    } catch (err) {
      next(err);
    }
  };

  public updateItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = this.extractUser(req);
      const item = await this.inventoryUseCases.updateItem(req.params.id as string, req.body, user);
      return res.status(200).json({
        success: true,
        message: 'Inventory item updated',
        data: item
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = this.extractUser(req);
      await this.inventoryUseCases.deleteItem(req.params.id as string, user);
      return res.status(200).json({
        success: true,
        message: 'Inventory item removed'
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 2. PURCHASE REQUESTS
  // ==========================================
  public createPurchaseRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const user = this.extractUser(req);
      const pr = await this.inventoryUseCases.createPurchaseRequest(
        {
          ...req.body,
          schoolId
        },
        user
      );
      return res.status(201).json({
        success: true,
        message: 'Purchase request submitted for review',
        data: pr
      });
    } catch (err) {
      next(err);
    }
  };

  public approvePurchaseRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = this.extractUser(req);
      const pr = await this.inventoryUseCases.approvePurchaseRequest(
        req.params.id as string,
        req.body,
        user
      );
      return res.status(200).json({
        success: true,
        message: `Purchase request ${pr.requestNumber} approved`,
        data: pr
      });
    } catch (err) {
      next(err);
    }
  };

  public rejectPurchaseRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = this.extractUser(req);
      const pr = await this.inventoryUseCases.rejectPurchaseRequest(
        req.params.id as string,
        req.body,
        user
      );
      return res.status(200).json({
        success: true,
        message: `Purchase request ${pr.requestNumber} rejected`,
        data: pr
      });
    } catch (err) {
      next(err);
    }
  };

  public listPurchaseRequests = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId;
      const status = req.query.status as string | undefined;
      const itemId = req.query.itemId as string | undefined;
      const requestedByUserId = req.query.requestedByUserId as string | undefined;
      const prs = await this.inventoryUseCases.listPurchaseRequests({
        schoolId,
        status,
        itemId,
        requestedByUserId
      });
      return res.status(200).json({
        success: true,
        count: prs.length,
        data: prs
      });
    } catch (err) {
      next(err);
    }
  };

  public getPurchaseRequestById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pr = await this.inventoryUseCases.getPurchaseRequestById(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: pr
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 3. GOODS RECEIVED NOTES (GRN)
  // ==========================================
  public receiveGoods = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const user = this.extractUser(req);
      const result = await this.inventoryUseCases.receiveGoods(
        {
          ...req.body,
          schoolId
        },
        user
      );
      return res.status(201).json({
        success: true,
        message: `Goods received and verified. Stock balance updated to ${result.item.quantityInStock} ${result.item.unit}.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public listGrns = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId;
      const purchaseRequestId = req.query.purchaseRequestId as string | undefined;
      const itemId = req.query.itemId as string | undefined;
      const grns = await this.inventoryUseCases.listGrns({
        schoolId,
        purchaseRequestId,
        itemId
      });
      return res.status(200).json({
        success: true,
        count: grns.length,
        data: grns
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 4. SUPPLIER INVOICES & PAYMENTS
  // ==========================================
  public recordSupplierInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const user = this.extractUser(req);
      const invoice = await this.inventoryUseCases.recordSupplierInvoice(
        {
          ...req.body,
          schoolId
        },
        user
      );
      return res.status(201).json({
        success: true,
        message: `Supplier invoice ${invoice.invoiceNumber} recorded`,
        data: invoice
      });
    } catch (err) {
      next(err);
    }
  };

  public listSupplierInvoices = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId;
      const paymentStatus = req.query.paymentStatus as string | undefined;
      const supplierName = req.query.supplierName as string | undefined;
      const purchaseRequestId = req.query.purchaseRequestId as string | undefined;
      const invoices = await this.inventoryUseCases.listSupplierInvoices({
        schoolId,
        paymentStatus,
        supplierName,
        purchaseRequestId
      });
      return res.status(200).json({
        success: true,
        count: invoices.length,
        data: invoices
      });
    } catch (err) {
      next(err);
    }
  };

  public getSupplierInvoiceById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const invoice = await this.inventoryUseCases.getSupplierInvoiceById(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: invoice
      });
    } catch (err) {
      next(err);
    }
  };

  public disbursePayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = this.extractUser(req);
      const result = await this.inventoryUseCases.disburseSupplierPayment(
        {
          invoiceId: req.params.id as string,
          ...req.body
        },
        user
      );
      return res.status(200).json({
        success: true,
        message: `Payment of KES ${req.body.amount.toLocaleString()} disbursed to ${result.invoice.supplierName}. Expense voucher created.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public reversePayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = this.extractUser(req);
      const result = await this.inventoryUseCases.reverseSupplierPayment(
        {
          invoiceId: req.params.id as string,
          reason: req.body.reason
        },
        user
      );
      return res.status(200).json({
        success: true,
        message: `Payment for invoice ${result.invoice.invoiceNumber} reversed. Cash balance restored.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 5. STOCK MOVEMENTS & REQUISITIONS
  // ==========================================
  public issueStock = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const user = this.extractUser(req);
      const result = await this.inventoryUseCases.issueStock(
        {
          ...req.body,
          schoolId
        },
        user
      );
      return res.status(200).json({
        success: true,
        message: `Stock issued to ${req.body.issuedTo}. Remaining stock: ${result.item.quantityInStock} ${result.item.unit}.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public adjustStock = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const user = this.extractUser(req);
      const result = await this.inventoryUseCases.adjustStock(
        {
          ...req.body,
          schoolId
        },
        user
      );
      return res.status(200).json({
        success: true,
        message: `Stock adjusted to ${result.item.quantityInStock} ${result.item.unit}.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public disposeStock = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const user = this.extractUser(req);
      const result = await this.inventoryUseCases.disposeStock(
        {
          ...req.body,
          schoolId
        },
        user
      );
      return res.status(200).json({
        success: true,
        message: `Stock item written off. Remaining stock: ${result.item.quantityInStock} ${result.item.unit}.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public listMovements = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId;
      const itemId = req.query.itemId as string | undefined;
      const movementType = req.query.movementType as string | undefined;
      const movements = await this.inventoryUseCases.listStockMovements({
        schoolId,
        itemId,
        movementType
      });
      return res.status(200).json({
        success: true,
        count: movements.length,
        data: movements
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // 6. BACKWARD-COMPATIBLE TRANSACTIONS
  // ==========================================
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

  // ==========================================
  // 7. FIXED ASSETS
  // ==========================================
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

  // ==========================================
  // 8. STATS & AUDIT REPORTS
  // ==========================================
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

  public getReports = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId;
      const reports = await this.inventoryUseCases.getInventoryReports(schoolId);
      return res.status(200).json({
        success: true,
        data: reports
      });
    } catch (err) {
      next(err);
    }
  };
}
