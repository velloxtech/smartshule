import { IInventoryRepository } from '../../core/ports/repositories/IInventoryRepository';
import { IFeeRepository } from '../../core/ports/repositories/IFeeRepository';
import { ISystemLogRepository } from '../../core/ports/repositories/ISystemLogRepository';
import {
  InventoryItem,
  InventoryItemProps,
  InventoryPurchaseRequest,
  InventoryPurchaseRequestProps,
  PurchaseRequestStatus,
  GoodsReceivedNote,
  GoodsReceivedNoteProps,
  SupplierInvoice,
  SupplierInvoiceProps,
  SupplierInvoiceStatus,
  StockMovement,
  StockMovementProps,
  StockMovementType,
  StockTransaction,
  StockTransactionProps,
  FixedAsset,
  FixedAssetProps,
  InventoryCategory
} from '../../core/domain/inventory/InventoryItem';
import { Expense, ExpenseCategory, ExpenseStatus } from '../../core/domain/finance/Fee';
import { SystemLog } from '../../core/domain/system-log/SystemLog';
import {
  IdGenerator,
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError
} from '../../core/domain/shared/Errors';

export interface RequestingUser {
  userId: string;
  name: string;
  email?: string;
  role: string;
}

export interface CreateStockTransactionDTO {
  schoolId: string;
  itemId: string;
  type: 'STOCK_IN' | 'STOCK_OUT';
  quantity: number;
  issuedTo?: string;
  authorizedBy: string;
  notes?: string;
}

export interface CreatePurchaseRequestDTO {
  schoolId: string;
  itemId: string;
  quantityRequested: number;
  estimatedUnitCost: number;
  reason: string;
  supportingDocumentUrl?: string;
  supplierName?: string;
}

export interface ApprovePurchaseRequestDTO {
  notes?: string;
}

export interface RejectPurchaseRequestDTO {
  reason: string;
}

export interface ReceiveGoodsDTO {
  schoolId: string;
  purchaseRequestId: string;
  quantityDelivered: number;
  quantityAccepted: number;
  quantityRejected?: number;
  rejectionReason?: string;
  deliveryNoteRef?: string;
  receivedDate?: string;
  notes?: string;
}

export interface RecordSupplierInvoiceDTO {
  schoolId: string;
  supplierName: string;
  invoiceNumber: string;
  purchaseRequestId?: string;
  invoiceDate: string;
  dueDate?: string;
  totalAmount: number;
  taxAmount?: number;
  documentUrl?: string;
  notes?: string;
}

export interface DisburseSupplierPaymentDTO {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentReference: string;
  fundingAccount: 'BANK' | 'MPESA' | 'CASH' | 'CHEQUE';
  voucherNumber?: string;
  paymentDate?: string;
  notes?: string;
}

export interface ReverseSupplierPaymentDTO {
  invoiceId: string;
  reason: string;
}

export interface StockIssueDTO {
  schoolId: string;
  itemId: string;
  quantity: number;
  issuedTo: string;
  purpose?: string;
  reason: string;
  date?: string;
}

export interface StockAdjustmentDTO {
  schoolId: string;
  itemId: string;
  newQuantity: number;
  reason: string;
  date?: string;
}

export interface StockDisposalDTO {
  schoolId: string;
  itemId: string;
  quantity: number;
  isDamagedLost?: boolean;
  reason: string;
  disposalOrderRef?: string;
  date?: string;
}

export class InventoryUseCases {
  constructor(
    private readonly inventoryRepository: IInventoryRepository,
    private readonly feeRepository?: IFeeRepository,
    private readonly systemLogRepository?: ISystemLogRepository
  ) {}

  // ==========================================
  // 1. CONSUMABLES & SUPPLIES CATALOG
  // ==========================================
  public async listItems(schoolId?: string, category?: string): Promise<any[]> {
    const items = await this.inventoryRepository.findAllItems(schoolId, category);
    return items.map(item => item.toJSON());
  }

  public async getItemById(id: string): Promise<any> {
    const item = await this.inventoryRepository.findItemById(id);
    if (!item) throw new NotFoundError('Inventory item', id);
    return item.toJSON();
  }

  public async addItem(props: InventoryItemProps, requestingUser?: RequestingUser): Promise<any> {
    if (!props.itemName || props.itemName.trim() === '') {
      throw new ValidationError('Item name is required.');
    }
    if (props.quantityInStock == null || props.quantityInStock < 0) {
      throw new ValidationError('Initial stock quantity cannot be negative.');
    }
    if (props.unitCost == null || props.unitCost < 0) {
      throw new ValidationError('Unit cost cannot be negative.');
    }

    const item = InventoryItem.create(
      {
        ...props,
        itemName: props.itemName.trim(),
        reorderLevel: props.reorderLevel != null ? props.reorderLevel : 10,
        quantityInStock: props.quantityInStock || 0
      },
      IdGenerator.generate()
    );

    await this.inventoryRepository.saveItem(item);

    if (this.systemLogRepository && requestingUser) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: item.schoolId,
              timestamp: new Date(),
              level: 'INFO',
              category: 'SYSTEM',
              action: 'CREATE_INVENTORY_ITEM',
              actorUserId: requestingUser.userId,
              actorEmail: requestingUser.email || 'administrator',
              actorRole: requestingUser.role as any,
              status: 'SUCCESS',
              details: `Added new inventory item ${item.itemName} (${item.category}) with initial stock ${item.quantityInStock}.`
            },
            IdGenerator.generate()
          )
        );
      } catch (err) {
        console.warn('[InventoryAudit] Failed to log create item:', err);
      }
    }

    return item.toJSON();
  }

  public async updateItem(id: string, updates: Partial<InventoryItemProps>, requestingUser?: RequestingUser): Promise<any> {
    const item = await this.inventoryRepository.findItemById(id);
    if (!item) throw new NotFoundError('Inventory item', id);

    item.updateDetails(updates);
    await this.inventoryRepository.updateItem(item);

    if (this.systemLogRepository && requestingUser) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: item.schoolId,
              timestamp: new Date(),
              level: 'INFO',
              category: 'SYSTEM',
              action: 'UPDATE_INVENTORY_ITEM',
              actorUserId: requestingUser.userId,
              actorEmail: requestingUser.email || 'administrator',
              actorRole: requestingUser.role as any,
              status: 'SUCCESS',
              details: `Updated details for inventory item ${item.itemName} (${item.id}).`
            },
            IdGenerator.generate()
          )
        );
      } catch (err) {
        console.warn('[InventoryAudit] Failed to log update item:', err);
      }
    }

    return item.toJSON();
  }

  public async deleteItem(id: string, requestingUser?: RequestingUser): Promise<void> {
    const item = await this.inventoryRepository.findItemById(id);
    if (!item) throw new NotFoundError('Inventory item', id);

    if (item.quantityInStock > 0) {
      throw new ValidationError(`Cannot delete inventory item with active stock balance (${item.quantityInStock} ${item.unit}). Adjust or dispose stock first.`);
    }

    await this.inventoryRepository.deleteItem(id);

    if (this.systemLogRepository && requestingUser) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: item.schoolId,
              timestamp: new Date(),
              level: 'WARN',
              category: 'SYSTEM',
              action: 'DELETE_INVENTORY_ITEM',
              actorUserId: requestingUser.userId,
              actorEmail: requestingUser.email || 'administrator',
              actorRole: requestingUser.role as any,
              status: 'SUCCESS',
              details: `Deleted inventory item ${item.itemName} (${item.id}).`
            },
            IdGenerator.generate()
          )
        );
      } catch (err) {
        console.warn('[InventoryAudit] Failed to log delete item:', err);
      }
    }
  }

  // ==========================================
  // 2. PURCHASE REQUESTS & APPROVAL WORKFLOW
  // ==========================================
  public async createPurchaseRequest(dto: CreatePurchaseRequestDTO, user: RequestingUser): Promise<any> {
    const item = await this.inventoryRepository.findItemById(dto.itemId);
    if (!item) throw new NotFoundError('Inventory item', dto.itemId);

    if (dto.quantityRequested <= 0) {
      throw new ValidationError('Requested quantity must be greater than zero.');
    }
    if (dto.estimatedUnitCost <= 0) {
      throw new ValidationError('Estimated unit cost must be greater than zero.');
    }
    if (!dto.reason || dto.reason.trim() === '') {
      throw new ValidationError('Reason for purchase is required.');
    }

    const totalEstimatedCost = Math.round(dto.quantityRequested * dto.estimatedUnitCost * 100) / 100;
    const requestNumber = `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const pr = InventoryPurchaseRequest.create(
      {
        schoolId: dto.schoolId,
        requestNumber,
        itemId: item.id,
        itemName: item.itemName,
        category: item.category,
        quantityRequested: dto.quantityRequested,
        estimatedUnitCost: dto.estimatedUnitCost,
        totalEstimatedCost,
        requestedByUserId: user.userId,
        requestedByName: user.name,
        requestedByEmail: user.email,
        reason: dto.reason.trim(),
        supportingDocumentUrl: dto.supportingDocumentUrl,
        status: 'REQUESTED',
        deliveredQuantity: 0,
        supplierName: dto.supplierName || item.supplier
      },
      IdGenerator.generate()
    );

    await this.inventoryRepository.savePurchaseRequest(pr);

    if (this.systemLogRepository) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: dto.schoolId,
              timestamp: new Date(),
              level: 'INFO',
              category: 'FINANCE',
              action: 'CREATE_PURCHASE_REQUEST',
              actorUserId: user.userId,
              actorEmail: user.email || 'administrator',
              actorRole: user.role as any,
              status: 'SUCCESS',
              details: `Purchase request ${pr.requestNumber} created for ${pr.quantityRequested} ${item.unit} of ${pr.itemName} (Estimated: KES ${pr.totalEstimatedCost.toLocaleString()}).`
            },
            IdGenerator.generate()
          )
        );
      } catch (err) {
        console.warn('[InventoryAudit] Failed to log PR creation:', err);
      }
    }

    return pr.toJSON();
  }

  public async approvePurchaseRequest(
    id: string,
    dto: ApprovePurchaseRequestDTO,
    user: RequestingUser
  ): Promise<any> {
    const pr = await this.inventoryRepository.findPurchaseRequestById(id);
    if (!pr) throw new NotFoundError('Inventory purchase request', id);

    // SEPARATION OF DUTIES ENFORCEMENT:
    // Requester cannot approve their own purchase request!
    if (pr.requestedByUserId === user.userId) {
      throw new ForbiddenError('Separation of duties violation: You cannot approve your own purchase request.');
    }

    if (pr.status !== 'REQUESTED') {
      throw new ValidationError(`Purchase request ${pr.requestNumber} cannot be approved because it is already in ${pr.status} status.`);
    }

    pr.approve(user.userId, user.name, dto.notes);
    await this.inventoryRepository.updatePurchaseRequest(pr);

    if (this.systemLogRepository) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: pr.schoolId,
              timestamp: new Date(),
              level: 'INFO',
              category: 'FINANCE',
              action: 'APPROVE_PURCHASE_REQUEST',
              actorUserId: user.userId,
              actorEmail: user.email || 'administrator',
              actorRole: user.role as any,
              status: 'SUCCESS',
              details: `Purchase request ${pr.requestNumber} approved by ${user.name} for ${pr.itemName} (Qty: ${pr.quantityRequested}). Stock and finances remain unchanged until delivery and payment.`
            },
            IdGenerator.generate()
          )
        );
      } catch (err) {
        console.warn('[InventoryAudit] Failed to log PR approval:', err);
      }
    }

    return pr.toJSON();
  }

  public async rejectPurchaseRequest(
    id: string,
    dto: RejectPurchaseRequestDTO,
    user: RequestingUser
  ): Promise<any> {
    const pr = await this.inventoryRepository.findPurchaseRequestById(id);
    if (!pr) throw new NotFoundError('Inventory purchase request', id);

    if (pr.status !== 'REQUESTED') {
      throw new ValidationError(`Purchase request ${pr.requestNumber} cannot be rejected because it is in ${pr.status} status.`);
    }

    if (!dto.reason || dto.reason.trim() === '') {
      throw new ValidationError('Rejection reason is required.');
    }

    pr.reject(user.userId, user.name, dto.reason.trim());
    await this.inventoryRepository.updatePurchaseRequest(pr);

    if (this.systemLogRepository) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: pr.schoolId,
              timestamp: new Date(),
              level: 'WARN',
              category: 'FINANCE',
              action: 'REJECT_PURCHASE_REQUEST',
              actorUserId: user.userId,
              actorEmail: user.email || 'administrator',
              actorRole: user.role as any,
              status: 'SUCCESS',
              details: `Purchase request ${pr.requestNumber} for ${pr.itemName} was rejected by ${user.name}. Reason: ${dto.reason}.`
            },
            IdGenerator.generate()
          )
        );
      } catch (err) {
        console.warn('[InventoryAudit] Failed to log PR rejection:', err);
      }
    }

    return pr.toJSON();
  }

  public async listPurchaseRequests(filters?: {
    schoolId?: string;
    status?: string;
    itemId?: string;
    requestedByUserId?: string;
  }): Promise<any[]> {
    const prs = await this.inventoryRepository.findPurchaseRequests(filters);
    return prs.map(pr => pr.toJSON());
  }

  public async getPurchaseRequestById(id: string): Promise<any> {
    const pr = await this.inventoryRepository.findPurchaseRequestById(id);
    if (!pr) throw new NotFoundError('Inventory purchase request', id);
    return pr.toJSON();
  }

  // ==========================================
  // 3. GOODS RECEIVED NOTES (GRN) VERIFICATION
  // ==========================================
  public async receiveGoods(dto: ReceiveGoodsDTO, user: RequestingUser): Promise<any> {
    const pr = await this.inventoryRepository.findPurchaseRequestById(dto.purchaseRequestId);
    if (!pr) throw new NotFoundError('Inventory purchase request', dto.purchaseRequestId);

    // Order status verification
    if (pr.status === 'REQUESTED') {
      throw new ValidationError(`Cannot receive goods for purchase request ${pr.requestNumber} because it has not yet been approved.`);
    }
    if (pr.status === 'REJECTED') {
      throw new ValidationError(`Cannot receive goods for purchase request ${pr.requestNumber} because it was rejected.`);
    }
    if (pr.status === 'CANCELLED') {
      throw new ValidationError(`Cannot receive goods for purchase request ${pr.requestNumber} because it was cancelled.`);
    }
    if (pr.status === 'DELIVERED') {
      throw new ValidationError(`Purchase request ${pr.requestNumber} has already been fully delivered.`);
    }

    if (dto.quantityDelivered < 0 || dto.quantityAccepted < 0) {
      throw new ValidationError('Delivered and accepted quantities cannot be negative.');
    }

    const quantityRejected = dto.quantityRejected != null ? dto.quantityRejected : Math.max(0, dto.quantityDelivered - dto.quantityAccepted);

    if (Math.round((dto.quantityAccepted + quantityRejected) * 100) / 100 !== Math.round(dto.quantityDelivered * 100) / 100) {
      throw new ValidationError('Sum of accepted and rejected quantities must equal total delivered quantity.');
    }

    // OVER-DELIVERY GUARD:
    // Quantity accepted cannot exceed remaining outstanding quantity
    const outstanding = pr.outstandingQuantity;
    if (dto.quantityAccepted > outstanding) {
      throw new ValidationError(`Accepted quantity (${dto.quantityAccepted}) exceeds remaining outstanding order quantity (${outstanding}).`);
    }

    const item = await this.inventoryRepository.findItemById(pr.itemId);
    if (!item) throw new NotFoundError('Inventory item', pr.itemId);

    const balanceBefore = item.quantityInStock;

    // STOCK ON HAND INCREMENT:
    // Only accepted quantities increase available stock!
    if (dto.quantityAccepted > 0) {
      item.addStock(dto.quantityAccepted);
      await this.inventoryRepository.updateItem(item);
    }

    // GENERATE GRN
    const grnNumber = `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const receivedDate = dto.receivedDate || new Date().toISOString().split('T')[0];

    const isFullDelivery = (pr.deliveredQuantity + dto.quantityAccepted) >= pr.quantityRequested;
    const deliveryStatus = isFullDelivery ? 'FULL' : dto.quantityAccepted === 0 ? 'REJECTED' : 'PARTIAL';

    const grn = GoodsReceivedNote.create(
      {
        schoolId: dto.schoolId,
        grnNumber,
        purchaseRequestId: pr.id,
        itemId: item.id,
        itemName: item.itemName,
        deliveryNoteRef: dto.deliveryNoteRef,
        quantityOrdered: pr.quantityRequested,
        quantityDelivered: dto.quantityDelivered,
        quantityAccepted: dto.quantityAccepted,
        quantityRejected,
        rejectionReason: dto.rejectionReason,
        receivedByUserId: user.userId,
        receivedByName: user.name,
        receivedDate,
        deliveryStatus,
        notes: dto.notes
      },
      IdGenerator.generate()
    );

    await this.inventoryRepository.saveGrn(grn);

    // RECORD AUDIT MOVEMENT
    if (dto.quantityAccepted > 0) {
      const movement = StockMovement.create(
        {
          schoolId: dto.schoolId,
          itemId: item.id,
          itemName: item.itemName,
          movementType: 'GOODS_RECEIVED',
          quantity: dto.quantityAccepted,
          balanceBefore,
          balanceAfter: item.quantityInStock,
          referenceId: grn.id,
          referenceType: 'GRN',
          reason: `Goods receipt note ${grn.grnNumber}${dto.deliveryNoteRef ? ` (DN: ${dto.deliveryNoteRef})` : ''}`,
          recordedByUserId: user.userId,
          recordedByName: user.name,
          authorizedByUserId: user.userId,
          authorizedByName: user.name,
          date: receivedDate
        },
        IdGenerator.generate()
      );
      await this.inventoryRepository.saveStockMovement(movement);
    }

    // UPDATE PURCHASE REQUEST DELIVERIES
    pr.recordDelivery(dto.quantityAccepted);
    await this.inventoryRepository.updatePurchaseRequest(pr);

    if (this.systemLogRepository) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: dto.schoolId,
              timestamp: new Date(),
              level: 'INFO',
              category: 'SYSTEM',
              action: 'RECEIVE_GOODS',
              actorUserId: user.userId,
              actorEmail: user.email || 'administrator',
              actorRole: user.role as any,
              status: 'SUCCESS',
              details: `GRN ${grn.grnNumber} generated for PR ${pr.requestNumber}. Accepted: ${dto.quantityAccepted} ${item.unit}, Rejected: ${quantityRejected}. Stock updated: ${balanceBefore} -> ${item.quantityInStock}.`
            },
            IdGenerator.generate()
          )
        );
      } catch (err) {
        console.warn('[InventoryAudit] Failed to log GRN:', err);
      }
    }

    return {
      grn: grn.toJSON(),
      item: item.toJSON(),
      purchaseRequest: pr.toJSON()
    };
  }

  public async listGrns(filters?: {
    schoolId?: string;
    purchaseRequestId?: string;
    itemId?: string;
  }): Promise<any[]> {
    const grns = await this.inventoryRepository.findGrns(filters);
    return grns.map(g => g.toJSON());
  }

  // ==========================================
  // 4. SUPPLIER INVOICES & FINANCIAL INTEGRATION
  // ==========================================
  public async recordSupplierInvoice(dto: RecordSupplierInvoiceDTO, user: RequestingUser): Promise<any> {
    if (!dto.supplierName || dto.supplierName.trim() === '') {
      throw new ValidationError('Supplier name is required.');
    }
    if (!dto.invoiceNumber || dto.invoiceNumber.trim() === '') {
      throw new ValidationError('Invoice number is required.');
    }
    if (dto.totalAmount <= 0) {
      throw new ValidationError('Total invoice amount must be greater than zero.');
    }

    // PREVENT DUPLICATE INVOICE
    const existing = await this.inventoryRepository.findSupplierInvoiceByNumber(
      dto.schoolId,
      dto.supplierName.trim(),
      dto.invoiceNumber.trim()
    );
    if (existing) {
      throw new ConflictError(`Supplier invoice "${dto.invoiceNumber}" from supplier "${dto.supplierName}" has already been recorded in SmartShule.`);
    }

    if (dto.purchaseRequestId) {
      const pr = await this.inventoryRepository.findPurchaseRequestById(dto.purchaseRequestId);
      if (!pr) throw new NotFoundError('Inventory purchase request', dto.purchaseRequestId);
    }

    const invoice = SupplierInvoice.create(
      {
        schoolId: dto.schoolId,
        supplierName: dto.supplierName.trim(),
        invoiceNumber: dto.invoiceNumber.trim(),
        purchaseRequestId: dto.purchaseRequestId,
        invoiceDate: dto.invoiceDate,
        dueDate: dto.dueDate,
        totalAmount: dto.totalAmount,
        taxAmount: dto.taxAmount || 0,
        amountPaid: 0,
        balance: dto.totalAmount,
        paymentStatus: 'UNPAID',
        documentUrl: dto.documentUrl,
        notes: dto.notes,
        verifiedByUserId: user.userId,
        verifiedAt: new Date()
      },
      IdGenerator.generate()
    );

    await this.inventoryRepository.saveSupplierInvoice(invoice);

    if (this.systemLogRepository) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: dto.schoolId,
              timestamp: new Date(),
              level: 'INFO',
              category: 'FINANCE',
              action: 'RECORD_SUPPLIER_INVOICE',
              actorUserId: user.userId,
              actorEmail: user.email || 'administrator',
              actorRole: user.role as any,
              status: 'SUCCESS',
              details: `Supplier invoice ${invoice.invoiceNumber} recorded for ${invoice.supplierName} (Total: KES ${invoice.totalAmount.toLocaleString()}, Status: UNPAID).`
            },
            IdGenerator.generate()
          )
        );
      } catch (err) {
        console.warn('[InventoryAudit] Failed to log invoice creation:', err);
      }
    }

    return invoice.toJSON();
  }

  public async listSupplierInvoices(filters?: {
    schoolId?: string;
    paymentStatus?: string;
    supplierName?: string;
    purchaseRequestId?: string;
  }): Promise<any[]> {
    const invoices = await this.inventoryRepository.findSupplierInvoices(filters);
    return invoices.map(i => i.toJSON());
  }

  public async getSupplierInvoiceById(id: string): Promise<any> {
    const invoice = await this.inventoryRepository.findSupplierInvoiceById(id);
    if (!invoice) throw new NotFoundError('Supplier invoice', id);
    return invoice.toJSON();
  }

  public async disburseSupplierPayment(
    dto: DisburseSupplierPaymentDTO,
    user: RequestingUser
  ): Promise<any> {
    const invoice = await this.inventoryRepository.findSupplierInvoiceById(dto.invoiceId);
    if (!invoice) throw new NotFoundError('Supplier invoice', dto.invoiceId);

    if (dto.amount <= 0) {
      throw new ValidationError('Disbursement amount must be greater than zero.');
    }

    if (dto.amount > invoice.balance) {
      throw new ValidationError(`Disbursement amount (KES ${dto.amount.toLocaleString()}) exceeds invoice outstanding balance (KES ${invoice.balance.toLocaleString()}).`);
    }

    const ref = dto.paymentReference ? dto.paymentReference.trim() : `PAY-${Date.now()}`;

    // PREVENT DUPLICATE PAYMENT REFERENCE
    if (this.feeRepository && ref) {
      const existingExpenses = await this.feeRepository.findExpenses({ schoolId: invoice.schoolId });
      const dupe = existingExpenses.find(e => e.paymentReference === ref && e.status !== ExpenseStatus.REJECTED);
      if (dupe) {
        throw new ConflictError(`Payment reference "${ref}" has already been recorded in SmartShule (Expense Voucher: ${dupe.voucherNumber}).`);
      }
    }

    const voucherNumber = dto.voucherNumber || `PV-INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const paymentDate = dto.paymentDate || new Date().toISOString().split('T')[0];
    const fundingAccount = dto.fundingAccount || (dto.paymentMethod === 'MPESA' ? 'MPESA' : dto.paymentMethod === 'CASH' ? 'CASH' : 'BANK');

    // POST TO SCHOOL FINANCIAL RECORDS (Expenses Outflow)
    let expense: Expense | null = null;
    if (this.feeRepository) {
      let expenseCategory = ExpenseCategory.CBC_LEARNING_MATERIALS;
      if (invoice.purchaseRequestId) {
        const pr = await this.inventoryRepository.findPurchaseRequestById(invoice.purchaseRequestId);
        if (pr) {
          if (pr.category === 'TEXTBOOKS' || pr.category === 'LAB_EQUIPMENT') {
            expenseCategory = ExpenseCategory.CBC_LEARNING_MATERIALS;
          } else if (pr.category === 'KITCHEN_FOOD') {
            expenseCategory = ExpenseCategory.MEALS_FEEDING;
          } else if (pr.category === 'CLEANING') {
            expenseCategory = ExpenseCategory.REPAIRS_MAINTENANCE;
          } else if (pr.category === 'STATIONERY') {
            expenseCategory = ExpenseCategory.ADMIN_OFFICE;
          } else {
            expenseCategory = ExpenseCategory.OTHER_EXPENSES;
          }
        }
      }

      const expensePaymentMethod =
        dto.paymentMethod === 'BANK'
          ? 'BANK_TRANSFER'
          : dto.paymentMethod;

      expense = Expense.create(
        {
          schoolId: invoice.schoolId,
          voucherNumber,
          category: expenseCategory,
          title: `Supplier Payment: ${invoice.supplierName} - Inv #${invoice.invoiceNumber}`,
          amount: dto.amount,
          paymentMethod: expensePaymentMethod as any,
          paymentReference: ref,
          payee: invoice.supplierName,
          expenseDate: paymentDate,
          status: ExpenseStatus.PAID,
          notes: `Payment for supplier invoice ${invoice.invoiceNumber}. Funding Account: ${fundingAccount}. ${dto.notes || ''}`.trim(),
          recordedByUserId: user.userId,
          approvedByUserId: user.userId
        },
        IdGenerator.generate()
      );

      await this.feeRepository.saveExpense(expense);
    }

    // UPDATE INVOICE RECORD
    invoice.recordPayment(
      dto.amount,
      dto.paymentMethod,
      ref,
      fundingAccount,
      expense ? expense.id : 'N/A',
      voucherNumber,
      user.userId,
      new Date(paymentDate)
    );

    await this.inventoryRepository.updateSupplierInvoice(invoice);

    if (this.systemLogRepository) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: invoice.schoolId,
              timestamp: new Date(),
              level: 'INFO',
              category: 'FINANCE',
              action: 'DISBURSE_SUPPLIER_PAYMENT',
              actorUserId: user.userId,
              actorEmail: user.email || 'administrator',
              actorRole: user.role as any,
              status: 'SUCCESS',
              details: `Disbursed KES ${dto.amount.toLocaleString()} to ${invoice.supplierName} for Inv #${invoice.invoiceNumber}. Voucher: ${voucherNumber}. Funding Account: ${fundingAccount}. Remaining Balance: KES ${invoice.balance.toLocaleString()}.`
            },
            IdGenerator.generate()
          )
        );
      } catch (err) {
        console.warn('[InventoryAudit] Failed to log payment:', err);
      }
    }

    return {
      invoice: invoice.toJSON(),
      expense: expense ? expense.toJSON() : undefined
    };
  }

  public async reverseSupplierPayment(
    dto: ReverseSupplierPaymentDTO,
    user: RequestingUser
  ): Promise<any> {
    const invoice = await this.inventoryRepository.findSupplierInvoiceById(dto.invoiceId);
    if (!invoice) throw new NotFoundError('Supplier invoice', dto.invoiceId);

    if (invoice.amountPaid <= 0 && invoice.paymentStatus === 'UNPAID') {
      throw new ValidationError('Invoice has no recorded payments to reverse.');
    }

    if (!dto.reason || dto.reason.trim() === '') {
      throw new ValidationError('Reversal reason is required.');
    }

    // REVERSE LINKED EXPENSE VOUCHER
    let reversedExpense: Expense | undefined;
    if (this.feeRepository && invoice.expenseId) {
      const exp = await this.feeRepository.findExpenseById(invoice.expenseId);
      if (exp) {
        exp.setStatus(ExpenseStatus.REJECTED, user.userId);
        await this.feeRepository.updateExpense(exp);
        reversedExpense = exp;
      }
    }

    const previousPaid = invoice.amountPaid;
    invoice.reversePayment(dto.reason.trim(), user.userId);
    await this.inventoryRepository.updateSupplierInvoice(invoice);

    if (this.systemLogRepository) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: invoice.schoolId,
              timestamp: new Date(),
              level: 'WARN',
              category: 'FINANCE',
              action: 'REVERSE_SUPPLIER_PAYMENT',
              actorUserId: user.userId,
              actorEmail: user.email || 'administrator',
              actorRole: user.role as any,
              status: 'SUCCESS',
              details: `Supplier payment of KES ${previousPaid.toLocaleString()} for Invoice ${invoice.invoiceNumber} reversed by ${user.name}. Reason: ${dto.reason}. Restored financial balance.`
            },
            IdGenerator.generate()
          )
        );
      } catch (err) {
        console.warn('[InventoryAudit] Failed to log reversal:', err);
      }
    }

    return {
      invoice: invoice.toJSON(),
      expense: reversedExpense ? reversedExpense.toJSON() : undefined
    };
  }

  // ==========================================
  // 5. STOCK MOVEMENTS (ISSUES, ADJUSTMENTS, DISPOSALS)
  // ==========================================
  public async issueStock(dto: StockIssueDTO, user: RequestingUser): Promise<any> {
    const item = await this.inventoryRepository.findItemById(dto.itemId);
    if (!item) throw new NotFoundError('Inventory item', dto.itemId);

    if (dto.quantity <= 0) {
      throw new ValidationError('Issued quantity must be greater than zero.');
    }
    if (!dto.issuedTo || dto.issuedTo.trim() === '') {
      throw new ValidationError('Recipient (issued to) is required.');
    }
    if (!dto.reason || dto.reason.trim() === '') {
      throw new ValidationError('Purpose or reason for issue is required.');
    }

    if (dto.quantity > item.quantityInStock) {
      throw new ValidationError(`Insufficient stock for ${item.itemName}. Available: ${item.quantityInStock}, Requested: ${dto.quantity}`);
    }

    const balanceBefore = item.quantityInStock;
    item.issueStock(dto.quantity);
    await this.inventoryRepository.updateItem(item);

    const movementDate = dto.date || new Date().toISOString().split('T')[0];
    const movement = StockMovement.create(
      {
        schoolId: dto.schoolId,
        itemId: item.id,
        itemName: item.itemName,
        movementType: 'STOCK_ISSUE',
        quantity: dto.quantity,
        balanceBefore,
        balanceAfter: item.quantityInStock,
        issuedTo: dto.issuedTo.trim(),
        purpose: dto.purpose,
        reason: dto.reason.trim(),
        recordedByUserId: user.userId,
        recordedByName: user.name,
        authorizedByUserId: user.userId,
        authorizedByName: user.name,
        date: movementDate
      },
      IdGenerator.generate()
    );

    await this.inventoryRepository.saveStockMovement(movement);

    return {
      item: item.toJSON(),
      movement: movement.toJSON()
    };
  }

  public async adjustStock(dto: StockAdjustmentDTO, user: RequestingUser): Promise<any> {
    const item = await this.inventoryRepository.findItemById(dto.itemId);
    if (!item) throw new NotFoundError('Inventory item', dto.itemId);

    if (dto.newQuantity < 0) {
      throw new ValidationError('New physical stock count cannot be negative.');
    }
    if (!dto.reason || dto.reason.trim() === '') {
      throw new ValidationError('Adjustment justification / stocktake reason is required.');
    }

    const balanceBefore = item.quantityInStock;
    const diff = Math.round((dto.newQuantity - balanceBefore) * 100) / 100;

    item.adjustStock(dto.newQuantity);
    await this.inventoryRepository.updateItem(item);

    const movementDate = dto.date || new Date().toISOString().split('T')[0];
    const movement = StockMovement.create(
      {
        schoolId: dto.schoolId,
        itemId: item.id,
        itemName: item.itemName,
        movementType: 'STOCK_ADJUSTMENT',
        quantity: diff,
        balanceBefore,
        balanceAfter: dto.newQuantity,
        reason: dto.reason.trim(),
        recordedByUserId: user.userId,
        recordedByName: user.name,
        authorizedByUserId: user.userId,
        authorizedByName: user.name,
        date: movementDate
      },
      IdGenerator.generate()
    );

    await this.inventoryRepository.saveStockMovement(movement);

    return {
      item: item.toJSON(),
      movement: movement.toJSON()
    };
  }

  public async disposeStock(dto: StockDisposalDTO, user: RequestingUser): Promise<any> {
    const item = await this.inventoryRepository.findItemById(dto.itemId);
    if (!item) throw new NotFoundError('Inventory item', dto.itemId);

    if (dto.quantity <= 0) {
      throw new ValidationError('Disposed quantity must be greater than zero.');
    }
    if (!dto.reason || dto.reason.trim() === '') {
      throw new ValidationError('Disposal / damage reason is required.');
    }

    if (dto.quantity > item.quantityInStock) {
      throw new ValidationError(`Cannot dispose more than available stock for ${item.itemName}. Available: ${item.quantityInStock}, Requested: ${dto.quantity}`);
    }

    const balanceBefore = item.quantityInStock;
    item.issueStock(dto.quantity);
    await this.inventoryRepository.updateItem(item);

    const movementDate = dto.date || new Date().toISOString().split('T')[0];
    const movement = StockMovement.create(
      {
        schoolId: dto.schoolId,
        itemId: item.id,
        itemName: item.itemName,
        movementType: dto.isDamagedLost ? 'DAMAGED_LOST' : 'DISPOSAL',
        quantity: dto.quantity,
        balanceBefore,
        balanceAfter: item.quantityInStock,
        referenceId: dto.disposalOrderRef,
        referenceType: 'DISPOSAL_ORDER',
        reason: dto.reason.trim(),
        recordedByUserId: user.userId,
        recordedByName: user.name,
        authorizedByUserId: user.userId,
        authorizedByName: user.name,
        date: movementDate
      },
      IdGenerator.generate()
    );

    await this.inventoryRepository.saveStockMovement(movement);

    return {
      item: item.toJSON(),
      movement: movement.toJSON()
    };
  }

  public async listStockMovements(filters?: {
    schoolId?: string;
    itemId?: string;
    movementType?: string;
  }): Promise<any[]> {
    const movements = await this.inventoryRepository.findStockMovements(filters);
    return movements.map(m => m.toJSON());
  }

  // ==========================================
  // 6. BACKWARD-COMPATIBLE STOCK TRANSACTIONS
  // ==========================================
  public async recordStockTransaction(dto: CreateStockTransactionDTO): Promise<any> {
    const item = await this.inventoryRepository.findItemById(dto.itemId);
    if (!item) throw new NotFoundError('Inventory item', dto.itemId);

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

  // ==========================================
  // 7. FIXED ASSETS REGISTER
  // ==========================================
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
    if (!asset) throw new NotFoundError('Fixed asset', id);

    asset.updateDetails(updates);
    await this.inventoryRepository.updateAsset(asset);
    return asset.toJSON();
  }

  public async deleteAsset(id: string): Promise<void> {
    const asset = await this.inventoryRepository.findAssetById(id);
    if (!asset) throw new NotFoundError('Fixed asset', id);
    await this.inventoryRepository.deleteAsset(id);
  }

  // ==========================================
  // 8. INVENTORY STATS & AUDIT REPORTS
  // ==========================================
  public async getInventoryStats(schoolId?: string) {
    const items = await this.inventoryRepository.findAllItems(schoolId);
    const assets = await this.inventoryRepository.findAssets(schoolId);
    const purchaseRequests = await this.inventoryRepository.findPurchaseRequests({ schoolId });
    const invoices = await this.inventoryRepository.findSupplierInvoices({ schoolId });

    const totalSuppliesValue = items.reduce((acc, cur) => acc + (cur.quantityInStock * cur.unitCost), 0);
    const lowStockCount = items.filter(i => i.isLowStock).length;
    const totalAssetsValue = assets.reduce((acc, cur) => acc + cur.purchaseCost, 0);

    const pendingRequests = purchaseRequests.filter(pr => pr.status === 'REQUESTED').length;
    const approvedRequests = purchaseRequests.filter(pr => pr.status === 'APPROVED' || pr.status === 'PARTIALLY_DELIVERED').length;

    const unpaidInvoices = invoices.filter(inv => inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PARTIALLY_PAID');
    const totalPayableBalance = unpaidInvoices.reduce((acc, cur) => acc + cur.balance, 0);

    return {
      totalItemsCount: items.length,
      lowStockCount,
      totalSuppliesValue: Math.round(totalSuppliesValue * 100) / 100,
      totalAssetsCount: assets.length,
      totalAssetsValue: Math.round(totalAssetsValue * 100) / 100,
      pendingRequestsCount: pendingRequests,
      activeApprovedRequestsCount: approvedRequests,
      unpaidInvoicesCount: unpaidInvoices.length,
      totalPayableBalance: Math.round(totalPayableBalance * 100) / 100
    };
  }

  public async getInventoryReports(schoolId?: string) {
    const stats = await this.getInventoryStats(schoolId);
    const lowStockItems = await this.getLowStockAlerts(schoolId);
    const movements = await this.inventoryRepository.findStockMovements({ schoolId });
    const invoices = await this.inventoryRepository.findSupplierInvoices({ schoolId });

    return {
      summary: stats,
      lowStockAlerts: lowStockItems,
      recentMovements: movements.slice(0, 50).map(m => m.toJSON()),
      unpaidInvoices: invoices
        .filter(i => i.paymentStatus !== 'PAID')
        .map(i => i.toJSON())
    };
  }
}
