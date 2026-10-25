import { Pool } from 'pg';
import { IInventoryRepository } from '../../../core/ports/repositories/IInventoryRepository';
import {
  InventoryItem,
  InventoryPurchaseRequest,
  GoodsReceivedNote,
  SupplierInvoice,
  StockMovement,
  StockTransaction,
  FixedAsset,
  InventoryCategory,
  PurchaseRequestStatus,
  SupplierInvoiceStatus,
  StockMovementType
} from '../../../core/domain/inventory/InventoryItem';

export class PostgresInventoryRepository implements IInventoryRepository {
  constructor(private readonly pool: Pool) {}

  private toDateString(d: any): string {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().split('T')[0];
    return String(d).split('T')[0];
  }

  // ==========================================
  // INVENTORY ITEMS
  // ==========================================
  private mapItemRow(r: any): InventoryItem {
    return InventoryItem.create(
      {
        schoolId: r.school_id,
        itemName: r.item_name,
        category: r.category as InventoryCategory,
        unit: r.unit,
        quantityInStock: Number(r.quantity_in_stock) || 0,
        reorderLevel: Number(r.reorder_level) || 0,
        unitCost: Number(r.unit_cost) || 0,
        supplier: r.supplier || undefined,
        notes: r.notes || undefined
      },
      r.id,
      r.created_at ? new Date(r.created_at) : undefined,
      r.updated_at ? new Date(r.updated_at) : undefined
    );
  }

  public async findItemById(id: string): Promise<InventoryItem | null> {
    const res = await this.pool.query('SELECT * FROM inventory_items WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapItemRow(res.rows[0]);
  }

  public async findAllItems(schoolId?: string, category?: string): Promise<InventoryItem[]> {
    let query = 'SELECT * FROM inventory_items WHERE 1=1';
    const params: any[] = [];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND school_id = $${params.length}`;
    }
    if (category && category !== 'ALL') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    query += ' ORDER BY item_name ASC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => this.mapItemRow(r));
  }

  public async saveItem(item: InventoryItem): Promise<void> {
    const q = `
      INSERT INTO inventory_items (
        id, school_id, item_name, category, unit,
        quantity_in_stock, reorder_level, unit_cost, supplier, notes,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12
      )
      ON CONFLICT (id) DO UPDATE SET
        item_name = EXCLUDED.item_name,
        category = EXCLUDED.category,
        unit = EXCLUDED.unit,
        quantity_in_stock = EXCLUDED.quantity_in_stock,
        reorder_level = EXCLUDED.reorder_level,
        unit_cost = EXCLUDED.unit_cost,
        supplier = EXCLUDED.supplier,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
    `;
    const p = (item as any)._props;
    await this.pool.query(q, [
      item.id,
      p.schoolId,
      p.itemName,
      p.category,
      p.unit,
      p.quantityInStock,
      p.reorderLevel,
      p.unitCost,
      p.supplier || null,
      p.notes || null,
      item.createdAt || new Date(),
      item.updatedAt || new Date()
    ]);
  }

  public async updateItem(item: InventoryItem): Promise<void> {
    await this.saveItem(item);
  }

  public async deleteItem(id: string): Promise<void> {
    await this.pool.query('DELETE FROM inventory_items WHERE id = $1', [id]);
  }

  // ==========================================
  // PURCHASE REQUESTS
  // ==========================================
  private mapPurchaseRequestRow(r: any): InventoryPurchaseRequest {
    return InventoryPurchaseRequest.create(
      {
        schoolId: r.school_id,
        requestNumber: r.request_number,
        itemId: r.item_id,
        itemName: r.item_name,
        category: r.category,
        quantityRequested: Number(r.quantity_requested) || 0,
        estimatedUnitCost: Number(r.estimated_unit_cost) || 0,
        totalEstimatedCost: Number(r.total_estimated_cost) || 0,
        requestedByUserId: r.requested_by_user_id,
        requestedByName: r.requested_by_name,
        requestedByEmail: r.requested_by_email || undefined,
        reason: r.reason,
        supportingDocumentUrl: r.supporting_document_url || undefined,
        status: r.status as PurchaseRequestStatus,
        approvedByUserId: r.approved_by_user_id || undefined,
        approvedByName: r.approved_by_name || undefined,
        approvedAt: r.approved_at ? new Date(r.approved_at) : undefined,
        approvalNotes: r.approval_notes || undefined,
        rejectionReason: r.rejection_reason || undefined,
        deliveredQuantity: Number(r.delivered_quantity) || 0,
        supplierName: r.supplier_name || undefined
      },
      r.id,
      r.created_at ? new Date(r.created_at) : undefined,
      r.updated_at ? new Date(r.updated_at) : undefined
    );
  }

  public async findPurchaseRequestById(id: string): Promise<InventoryPurchaseRequest | null> {
    const res = await this.pool.query('SELECT * FROM inventory_purchase_requests WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapPurchaseRequestRow(res.rows[0]);
  }

  public async findPurchaseRequests(filters?: {
    schoolId?: string;
    status?: string;
    itemId?: string;
    requestedByUserId?: string;
  }): Promise<InventoryPurchaseRequest[]> {
    let query = 'SELECT * FROM inventory_purchase_requests WHERE 1=1';
    const params: any[] = [];
    if (filters?.schoolId) {
      params.push(filters.schoolId);
      query += ` AND school_id = $${params.length}`;
    }
    if (filters?.status && filters.status !== 'ALL') {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }
    if (filters?.itemId) {
      params.push(filters.itemId);
      query += ` AND item_id = $${params.length}`;
    }
    if (filters?.requestedByUserId) {
      params.push(filters.requestedByUserId);
      query += ` AND requested_by_user_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => this.mapPurchaseRequestRow(r));
  }

  public async savePurchaseRequest(pr: InventoryPurchaseRequest): Promise<void> {
    const q = `
      INSERT INTO inventory_purchase_requests (
        id, school_id, request_number, item_id, item_name, category,
        quantity_requested, estimated_unit_cost, total_estimated_cost,
        requested_by_user_id, requested_by_name, requested_by_email,
        reason, supporting_document_url, status,
        approved_by_user_id, approved_by_name, approved_at, approval_notes,
        rejection_reason, delivered_quantity, supplier_name,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22,
        $23, $24
      )
      ON CONFLICT (id) DO UPDATE SET
        item_id = EXCLUDED.item_id,
        item_name = EXCLUDED.item_name,
        category = EXCLUDED.category,
        quantity_requested = EXCLUDED.quantity_requested,
        estimated_unit_cost = EXCLUDED.estimated_unit_cost,
        total_estimated_cost = EXCLUDED.total_estimated_cost,
        requested_by_user_id = EXCLUDED.requested_by_user_id,
        requested_by_name = EXCLUDED.requested_by_name,
        requested_by_email = EXCLUDED.requested_by_email,
        reason = EXCLUDED.reason,
        supporting_document_url = EXCLUDED.supporting_document_url,
        status = EXCLUDED.status,
        approved_by_user_id = EXCLUDED.approved_by_user_id,
        approved_by_name = EXCLUDED.approved_by_name,
        approved_at = EXCLUDED.approved_at,
        approval_notes = EXCLUDED.approval_notes,
        rejection_reason = EXCLUDED.rejection_reason,
        delivered_quantity = EXCLUDED.delivered_quantity,
        supplier_name = EXCLUDED.supplier_name,
        updated_at = EXCLUDED.updated_at
    `;
    const p = (pr as any)._props;
    await this.pool.query(q, [
      pr.id,
      p.schoolId,
      p.requestNumber,
      p.itemId,
      p.itemName,
      p.category,
      p.quantityRequested,
      p.estimatedUnitCost,
      p.totalEstimatedCost,
      p.requestedByUserId,
      p.requestedByName,
      p.requestedByEmail || null,
      p.reason,
      p.supportingDocumentUrl || null,
      p.status,
      p.approvedByUserId || null,
      p.approvedByName || null,
      p.approvedAt || null,
      p.approvalNotes || null,
      p.rejectionReason || null,
      p.deliveredQuantity || 0,
      p.supplierName || null,
      pr.createdAt || new Date(),
      pr.updatedAt || new Date()
    ]);
  }

  public async updatePurchaseRequest(pr: InventoryPurchaseRequest): Promise<void> {
    await this.savePurchaseRequest(pr);
  }

  // ==========================================
  // GOODS RECEIVED NOTES (GRN)
  // ==========================================
  private mapGrnRow(r: any): GoodsReceivedNote {
    return GoodsReceivedNote.create(
      {
        schoolId: r.school_id,
        grnNumber: r.grn_number,
        purchaseRequestId: r.purchase_request_id,
        itemId: r.item_id,
        itemName: r.item_name,
        deliveryNoteRef: r.delivery_note_ref || undefined,
        quantityOrdered: Number(r.quantity_ordered) || 0,
        quantityDelivered: Number(r.quantity_delivered) || 0,
        quantityAccepted: Number(r.quantity_accepted) || 0,
        quantityRejected: Number(r.quantity_rejected) || 0,
        rejectionReason: r.rejection_reason || undefined,
        receivedByUserId: r.received_by_user_id,
        receivedByName: r.received_by_name,
        receivedDate: this.toDateString(r.received_date),
        deliveryStatus: r.delivery_status as any,
        notes: r.notes || undefined
      },
      r.id,
      r.created_at ? new Date(r.created_at) : undefined,
      r.updated_at ? new Date(r.updated_at) : undefined
    );
  }

  public async findGrnById(id: string): Promise<GoodsReceivedNote | null> {
    const res = await this.pool.query('SELECT * FROM goods_received_notes WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapGrnRow(res.rows[0]);
  }

  public async findGrns(filters?: {
    schoolId?: string;
    purchaseRequestId?: string;
    itemId?: string;
  }): Promise<GoodsReceivedNote[]> {
    let query = 'SELECT * FROM goods_received_notes WHERE 1=1';
    const params: any[] = [];
    if (filters?.schoolId) {
      params.push(filters.schoolId);
      query += ` AND school_id = $${params.length}`;
    }
    if (filters?.purchaseRequestId) {
      params.push(filters.purchaseRequestId);
      query += ` AND purchase_request_id = $${params.length}`;
    }
    if (filters?.itemId) {
      params.push(filters.itemId);
      query += ` AND item_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => this.mapGrnRow(r));
  }

  public async saveGrn(grn: GoodsReceivedNote): Promise<void> {
    const q = `
      INSERT INTO goods_received_notes (
        id, school_id, grn_number, purchase_request_id, item_id, item_name,
        delivery_note_ref, quantity_ordered, quantity_delivered, quantity_accepted,
        quantity_rejected, rejection_reason, received_by_user_id, received_by_name,
        received_date, delivery_status, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18, $19
      )
      ON CONFLICT (id) DO UPDATE SET
        quantity_delivered = EXCLUDED.quantity_delivered,
        quantity_accepted = EXCLUDED.quantity_accepted,
        quantity_rejected = EXCLUDED.quantity_rejected,
        rejection_reason = EXCLUDED.rejection_reason,
        delivery_status = EXCLUDED.delivery_status,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
    `;
    const p = (grn as any)._props;
    await this.pool.query(q, [
      grn.id,
      p.schoolId,
      p.grnNumber,
      p.purchaseRequestId,
      p.itemId,
      p.itemName,
      p.deliveryNoteRef || null,
      p.quantityOrdered,
      p.quantityDelivered,
      p.quantityAccepted,
      p.quantityRejected || 0,
      p.rejectionReason || null,
      p.receivedByUserId,
      p.receivedByName,
      p.receivedDate,
      p.deliveryStatus,
      p.notes || null,
      grn.createdAt || new Date(),
      grn.updatedAt || new Date()
    ]);
  }

  // ==========================================
  // SUPPLIER INVOICES & ACCOUNTS PAYABLE
  // ==========================================
  private mapSupplierInvoiceRow(r: any): SupplierInvoice {
    return SupplierInvoice.create(
      {
        schoolId: r.school_id,
        supplierName: r.supplier_name,
        invoiceNumber: r.invoice_number,
        purchaseRequestId: r.purchase_request_id || undefined,
        invoiceDate: this.toDateString(r.invoice_date),
        dueDate: r.due_date ? this.toDateString(r.due_date) : undefined,
        totalAmount: Number(r.total_amount) || 0,
        taxAmount: Number(r.tax_amount) || 0,
        amountPaid: Number(r.amount_paid) || 0,
        balance: Number(r.balance) || 0,
        paymentStatus: r.payment_status as SupplierInvoiceStatus,
        fundingAccount: r.funding_account || undefined,
        expenseId: r.expense_id || undefined,
        voucherNumber: r.voucher_number || undefined,
        paymentMethod: r.payment_method || undefined,
        paymentReference: r.payment_reference || undefined,
        paidByUserId: r.paid_by_user_id || undefined,
        paidAt: r.paid_at ? new Date(r.paid_at) : undefined,
        verifiedByUserId: r.verified_by_user_id || undefined,
        verifiedAt: r.verified_at ? new Date(r.verified_at) : undefined,
        documentUrl: r.document_url || undefined,
        notes: r.notes || undefined
      },
      r.id,
      r.created_at ? new Date(r.created_at) : undefined,
      r.updated_at ? new Date(r.updated_at) : undefined
    );
  }

  public async findSupplierInvoiceById(id: string): Promise<SupplierInvoice | null> {
    const res = await this.pool.query('SELECT * FROM inventory_supplier_invoices WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapSupplierInvoiceRow(res.rows[0]);
  }

  public async findSupplierInvoices(filters?: {
    schoolId?: string;
    paymentStatus?: string;
    supplierName?: string;
    purchaseRequestId?: string;
  }): Promise<SupplierInvoice[]> {
    let query = 'SELECT * FROM inventory_supplier_invoices WHERE 1=1';
    const params: any[] = [];
    if (filters?.schoolId) {
      params.push(filters.schoolId);
      query += ` AND school_id = $${params.length}`;
    }
    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      params.push(filters.paymentStatus);
      query += ` AND payment_status = $${params.length}`;
    }
    if (filters?.supplierName) {
      params.push(`%${filters.supplierName}%`);
      query += ` AND supplier_name ILIKE $${params.length}`;
    }
    if (filters?.purchaseRequestId) {
      params.push(filters.purchaseRequestId);
      query += ` AND purchase_request_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => this.mapSupplierInvoiceRow(r));
  }

  public async findSupplierInvoiceByNumber(
    schoolId: string,
    supplierName: string,
    invoiceNumber: string
  ): Promise<SupplierInvoice | null> {
    const res = await this.pool.query(
      `SELECT * FROM inventory_supplier_invoices 
       WHERE school_id = $1 
         AND LOWER(TRIM(supplier_name)) = LOWER(TRIM($2)) 
         AND LOWER(TRIM(invoice_number)) = LOWER(TRIM($3))`,
      [schoolId, supplierName, invoiceNumber]
    );
    if (!res.rows.length) return null;
    return this.mapSupplierInvoiceRow(res.rows[0]);
  }

  public async saveSupplierInvoice(inv: SupplierInvoice): Promise<void> {
    const q = `
      INSERT INTO inventory_supplier_invoices (
        id, school_id, supplier_name, invoice_number, purchase_request_id,
        invoice_date, due_date, total_amount, tax_amount, amount_paid,
        balance, payment_status, funding_account, expense_id, voucher_number,
        payment_method, payment_reference, paid_by_user_id, paid_at,
        verified_by_user_id, verified_at, document_url, notes,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22, $23,
        $24, $25
      )
      ON CONFLICT (id) DO UPDATE SET
        supplier_name = EXCLUDED.supplier_name,
        invoice_number = EXCLUDED.invoice_number,
        purchase_request_id = EXCLUDED.purchase_request_id,
        invoice_date = EXCLUDED.invoice_date,
        due_date = EXCLUDED.due_date,
        total_amount = EXCLUDED.total_amount,
        tax_amount = EXCLUDED.tax_amount,
        amount_paid = EXCLUDED.amount_paid,
        balance = EXCLUDED.balance,
        payment_status = EXCLUDED.payment_status,
        funding_account = EXCLUDED.funding_account,
        expense_id = EXCLUDED.expense_id,
        voucher_number = EXCLUDED.voucher_number,
        payment_method = EXCLUDED.payment_method,
        payment_reference = EXCLUDED.payment_reference,
        paid_by_user_id = EXCLUDED.paid_by_user_id,
        paid_at = EXCLUDED.paid_at,
        verified_by_user_id = EXCLUDED.verified_by_user_id,
        verified_at = EXCLUDED.verified_at,
        document_url = EXCLUDED.document_url,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
    `;
    const p = (inv as any)._props;
    await this.pool.query(q, [
      inv.id,
      p.schoolId,
      p.supplierName,
      p.invoiceNumber,
      p.purchaseRequestId || null,
      p.invoiceDate,
      p.dueDate || null,
      p.totalAmount,
      p.taxAmount || 0,
      p.amountPaid || 0,
      p.balance,
      p.paymentStatus,
      p.fundingAccount || null,
      p.expenseId || null,
      p.voucherNumber || null,
      p.paymentMethod || null,
      p.paymentReference || null,
      p.paidByUserId || null,
      p.paidAt || null,
      p.verifiedByUserId || null,
      p.verifiedAt || null,
      p.documentUrl || null,
      p.notes || null,
      inv.createdAt || new Date(),
      inv.updatedAt || new Date()
    ]);
  }

  public async updateSupplierInvoice(inv: SupplierInvoice): Promise<void> {
    await this.saveSupplierInvoice(inv);
  }

  // ==========================================
  // STOCK MOVEMENTS & AUDIT TRAIL
  // ==========================================
  private mapStockMovementRow(r: any): StockMovement {
    return StockMovement.create(
      {
        schoolId: r.school_id,
        itemId: r.item_id,
        itemName: r.item_name,
        movementType: r.movement_type as StockMovementType,
        quantity: Number(r.quantity) || 0,
        balanceBefore: Number(r.balance_before) || 0,
        balanceAfter: Number(r.balance_after) || 0,
        referenceId: r.reference_id || undefined,
        referenceType: r.reference_type || undefined,
        issuedTo: r.issued_to || undefined,
        purpose: r.purpose || undefined,
        reason: r.reason,
        recordedByUserId: r.recorded_by_user_id,
        recordedByName: r.recorded_by_name,
        authorizedByUserId: r.authorized_by_user_id,
        authorizedByName: r.authorized_by_name,
        date: this.toDateString(r.date)
      },
      r.id,
      r.created_at ? new Date(r.created_at) : undefined,
      undefined
    );
  }

  public async saveStockMovement(movement: StockMovement): Promise<void> {
    const q = `
      INSERT INTO inventory_stock_movements (
        id, school_id, item_id, item_name, movement_type,
        quantity, balance_before, balance_after,
        reference_id, reference_type, issued_to, purpose, reason,
        recorded_by_user_id, recorded_by_name,
        authorized_by_user_id, authorized_by_name, date, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15,
        $16, $17, $18, $19
      )
    `;
    const p = (movement as any)._props;
    await this.pool.query(q, [
      movement.id,
      p.schoolId,
      p.itemId,
      p.itemName,
      p.movementType,
      p.quantity,
      p.balanceBefore,
      p.balanceAfter,
      p.referenceId || null,
      p.referenceType || null,
      p.issuedTo || null,
      p.purpose || null,
      p.reason,
      p.recordedByUserId,
      p.recordedByName,
      p.authorizedByUserId,
      p.authorizedByName,
      p.date,
      movement.createdAt || new Date()
    ]);
  }

  public async findStockMovements(filters?: {
    schoolId?: string;
    itemId?: string;
    movementType?: string;
  }): Promise<StockMovement[]> {
    let query = 'SELECT * FROM inventory_stock_movements WHERE 1=1';
    const params: any[] = [];
    if (filters?.schoolId) {
      params.push(filters.schoolId);
      query += ` AND school_id = $${params.length}`;
    }
    if (filters?.itemId) {
      params.push(filters.itemId);
      query += ` AND item_id = $${params.length}`;
    }
    if (filters?.movementType && filters.movementType !== 'ALL') {
      params.push(filters.movementType);
      query += ` AND movement_type = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => this.mapStockMovementRow(r));
  }

  // ==========================================
  // BACKWARD-COMPATIBLE TRANSACTIONS
  // ==========================================
  private mapTransactionRow(r: any): StockTransaction {
    return StockTransaction.create(
      {
        schoolId: r.school_id,
        itemId: r.item_id,
        itemName: r.item_name,
        type: r.type,
        quantity: Number(r.quantity) || 0,
        issuedTo: r.issued_to || undefined,
        authorizedBy: r.authorized_by,
        date: this.toDateString(r.date),
        notes: r.notes || undefined
      },
      r.id,
      r.created_at ? new Date(r.created_at) : undefined,
      undefined
    );
  }

  public async saveTransaction(tx: StockTransaction): Promise<void> {
    const q = `
      INSERT INTO stock_transactions (
        id, school_id, item_id, item_name, type,
        quantity, issued_to, authorized_by, date, notes, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11
      )
    `;
    const p = (tx as any)._props;
    await this.pool.query(q, [
      tx.id,
      p.schoolId,
      p.itemId,
      p.itemName,
      p.type,
      p.quantity,
      p.issuedTo || null,
      p.authorizedBy,
      p.date,
      p.notes || null,
      tx.createdAt || new Date()
    ]);
  }

  public async findTransactions(filters?: { itemId?: string; schoolId?: string }): Promise<StockTransaction[]> {
    let query = 'SELECT * FROM stock_transactions WHERE 1=1';
    const params: any[] = [];
    if (filters?.schoolId) {
      params.push(filters.schoolId);
      query += ` AND school_id = $${params.length}`;
    }
    if (filters?.itemId) {
      params.push(filters.itemId);
      query += ` AND item_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => this.mapTransactionRow(r));
  }

  // ==========================================
  // FIXED ASSETS
  // ==========================================
  private mapAssetRow(r: any): FixedAsset {
    return FixedAsset.create(
      {
        schoolId: r.school_id,
        assetName: r.asset_name,
        assetTag: r.asset_tag,
        category: r.category as any,
        purchaseDate: this.toDateString(r.purchase_date),
        purchaseCost: Number(r.purchase_cost) || 0,
        location: r.location,
        condition: r.condition as any,
        assignedTo: r.assigned_to || undefined
      },
      r.id,
      r.created_at ? new Date(r.created_at) : undefined,
      r.updated_at ? new Date(r.updated_at) : undefined
    );
  }

  public async findAssetById(id: string): Promise<FixedAsset | null> {
    const res = await this.pool.query('SELECT * FROM fixed_assets WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapAssetRow(res.rows[0]);
  }

  public async findAssets(schoolId?: string, category?: string): Promise<FixedAsset[]> {
    let query = 'SELECT * FROM fixed_assets WHERE 1=1';
    const params: any[] = [];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND school_id = $${params.length}`;
    }
    if (category && category !== 'ALL') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    query += ' ORDER BY asset_name ASC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => this.mapAssetRow(r));
  }

  public async saveAsset(asset: FixedAsset): Promise<void> {
    const q = `
      INSERT INTO fixed_assets (
        id, school_id, asset_name, asset_tag, category,
        purchase_date, purchase_cost, location, condition,
        assigned_to, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12
      )
      ON CONFLICT (id) DO UPDATE SET
        asset_name = EXCLUDED.asset_name,
        asset_tag = EXCLUDED.asset_tag,
        category = EXCLUDED.category,
        purchase_date = EXCLUDED.purchase_date,
        purchase_cost = EXCLUDED.purchase_cost,
        location = EXCLUDED.location,
        condition = EXCLUDED.condition,
        assigned_to = EXCLUDED.assigned_to,
        updated_at = EXCLUDED.updated_at
    `;
    const p = (asset as any)._props;
    await this.pool.query(q, [
      asset.id,
      p.schoolId,
      p.assetName,
      p.assetTag,
      p.category,
      p.purchaseDate,
      p.purchaseCost,
      p.location,
      p.condition,
      p.assignedTo || null,
      asset.createdAt || new Date(),
      asset.updatedAt || new Date()
    ]);
  }

  public async updateAsset(asset: FixedAsset): Promise<void> {
    await this.saveAsset(asset);
  }

  public async deleteAsset(id: string): Promise<void> {
    await this.pool.query('DELETE FROM fixed_assets WHERE id = $1', [id]);
  }
}
