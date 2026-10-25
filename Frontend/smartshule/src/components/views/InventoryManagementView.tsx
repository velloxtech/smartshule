import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  InventoryItem,
  InventoryPurchaseRequest,
  GoodsReceivedNote,
  SupplierInvoice,
  StockMovement,
  FixedAsset
} from '../../types';

export const InventoryManagementView: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'items' | 'requests' | 'grn' | 'invoices' | 'movements' | 'assets'>('items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<InventoryPurchaseRequest[]>([]);
  const [grns, setGrns] = useState<GoodsReceivedNote[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isNewPRModalOpen, setIsNewPRModalOpen] = useState(false);
  const [isApprovePRModalOpen, setIsApprovePRModalOpen] = useState(false);
  const [isRejectPRModalOpen, setIsRejectPRModalOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState<InventoryPurchaseRequest | null>(null);

  const [isReceiveGoodsModalOpen, setIsReceiveGoodsModalOpen] = useState(false);

  const [isRecordInvoiceModalOpen, setIsRecordInvoiceModalOpen] = useState(false);
  const [isPayInvoiceModalOpen, setIsPayInvoiceModalOpen] = useState(false);
  const [isReversePaymentModalOpen, setIsReversePaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);

  const [isIssueStockModalOpen, setIsIssueStockModalOpen] = useState(false);
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [isDisposeStockModalOpen, setIsDisposeStockModalOpen] = useState(false);

  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);

  // Form states
  const [itemForm, setItemForm] = useState({
    itemName: '',
    category: 'STATIONERY' as InventoryItem['category'],
    unit: 'Pieces',
    quantityInStock: 0,
    reorderLevel: 10,
    unitCost: 100,
    supplier: '',
    notes: ''
  });

  const [prForm, setPrForm] = useState({
    itemId: '',
    quantityRequested: 10,
    estimatedUnitCost: 100,
    reason: '',
    supportingDocumentUrl: '',
    supplierName: ''
  });

  const [prActionForm, setPrActionForm] = useState({
    notes: '',
    reason: ''
  });

  const [grnForm, setGrnForm] = useState({
    purchaseRequestId: '',
    quantityDelivered: 10,
    quantityAccepted: 10,
    quantityRejected: 0,
    rejectionReason: '',
    deliveryNoteRef: '',
    receivedDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [invoiceForm, setInvoiceForm] = useState({
    supplierName: '',
    invoiceNumber: '',
    purchaseRequestId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    totalAmount: 1000,
    taxAmount: 0,
    documentUrl: '',
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 1000,
    paymentMethod: 'BANK' as 'BANK' | 'MPESA' | 'CASH' | 'CHEQUE',
    fundingAccount: 'BANK' as 'BANK' | 'MPESA' | 'CASH' | 'CHEQUE',
    paymentReference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [reversalForm, setReversalForm] = useState({
    reason: ''
  });

  const [issueForm, setIssueForm] = useState({
    itemId: '',
    quantity: 1,
    issuedTo: '',
    purpose: '',
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [adjustForm, setAdjustForm] = useState({
    itemId: '',
    newQuantity: 0,
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [disposeForm, setDisposeForm] = useState({
    itemId: '',
    quantity: 1,
    isDamagedLost: true,
    reason: '',
    disposalOrderRef: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [assetForm, setAssetForm] = useState({
    assetName: '',
    assetTag: '',
    category: 'FURNITURE_DESKS' as FixedAsset['category'],
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: 4500,
    location: 'Main Block',
    condition: 'EXCELLENT' as FixedAsset['condition'],
    assignedTo: ''
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, prRes, grnRes, invRes, mvRes, assetsRes] = await Promise.all([
        apiService.getInventoryItems(),
        apiService.getPurchaseRequests(),
        apiService.getGoodsReceivedNotes(),
        apiService.getSupplierInvoices(),
        apiService.getStockMovements(),
        apiService.getFixedAssets()
      ]);
      if (itemsRes?.data) setItems(itemsRes.data);
      if (prRes?.data) setPurchaseRequests(prRes.data);
      if (grnRes?.data) setGrns(grnRes.data);
      if (invRes?.data) setInvoices(invRes.data);
      if (mvRes?.data) setMovements(mvRes.data);
      if (assetsRes?.data) setAssets(assetsRes.data);
    } catch (err: any) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalValuation = items.reduce((acc, i) => acc + (i.quantityInStock * (i.unitCost || 0)), 0);
    const lowStockItems = items.filter((i) => i.quantityInStock <= i.reorderLevel);
    const totalAssetsValuation = assets.reduce((acc, a) => acc + (a.purchaseCost || 0), 0);

    const pendingPRs = purchaseRequests.filter((pr) => pr.status === 'REQUESTED');
    const unpaidInvoices = invoices.filter((inv) => inv.paymentStatus !== 'PAID');
    const totalAccountsPayable = unpaidInvoices.reduce((acc, inv) => acc + inv.balance, 0);

    return {
      totalItems,
      totalValuation,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      totalAssets: assets.length,
      totalAssetsValuation,
      pendingPRCount: pendingPRs.length,
      unpaidInvoicesCount: unpaidInvoices.length,
      totalAccountsPayable
    };
  }, [items, assets, purchaseRequests, invoices]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (categoryFilter !== 'ALL' && i.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return i.itemName.toLowerCase().includes(q) || (i.supplier && i.supplier.toLowerCase().includes(q));
      }
      return true;
    });
  }, [items, categoryFilter, searchQuery]);

  // Handlers
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.itemName.trim()) return;
    try {
      const res = await apiService.addInventoryItem(itemForm);
      if (res.success) {
        showNotification(`Item "${itemForm.itemName}" added to catalog.`);
        setIsAddItemModalOpen(false);
        setItemForm({
          itemName: '',
          category: 'STATIONERY',
          unit: 'Pieces',
          quantityInStock: 0,
          reorderLevel: 10,
          unitCost: 100,
          supplier: '',
          notes: ''
        });
        loadData();
      } else {
        showNotification(res.message || 'Failed to add item', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleCreatePurchaseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prForm.itemId || prForm.quantityRequested <= 0) return;
    try {
      const res = await apiService.createPurchaseRequest(prForm);
      if (res.success) {
        showNotification(`Purchase Request ${res.data.requestNumber} submitted for approval.`);
        setIsNewPRModalOpen(false);
        setPrForm({
          itemId: '',
          quantityRequested: 10,
          estimatedUnitCost: 100,
          reason: '',
          supportingDocumentUrl: '',
          supplierName: ''
        });
        loadData();
      } else {
        showNotification(res.message || 'Failed to create purchase request', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleApprovePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPR) return;
    try {
      const res = await apiService.approvePurchaseRequest(selectedPR.id, prActionForm.notes);
      if (res.success) {
        showNotification(`Purchase Request ${selectedPR.requestNumber} approved.`);
        setIsApprovePRModalOpen(false);
        setSelectedPR(null);
        setPrActionForm({ notes: '', reason: '' });
        loadData();
      } else {
        showNotification(res.message || 'Failed to approve request', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleRejectPR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPR || !prActionForm.reason.trim()) return;
    try {
      const res = await apiService.rejectPurchaseRequest(selectedPR.id, prActionForm.reason.trim());
      if (res.success) {
        showNotification(`Purchase Request ${selectedPR.requestNumber} rejected.`);
        setIsRejectPRModalOpen(false);
        setSelectedPR(null);
        setPrActionForm({ notes: '', reason: '' });
        loadData();
      } else {
        showNotification(res.message || 'Failed to reject request', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grnForm.purchaseRequestId || grnForm.quantityDelivered <= 0) return;
    try {
      const res = await apiService.receiveGoods(grnForm);
      if (res.success) {
        showNotification(`GRN ${res.data.grn.grnNumber} processed. Stock updated to ${res.data.item.quantityInStock} ${res.data.item.unit}.`);
        setIsReceiveGoodsModalOpen(false);
        setGrnForm({
          purchaseRequestId: '',
          quantityDelivered: 10,
          quantityAccepted: 10,
          quantityRejected: 0,
          rejectionReason: '',
          deliveryNoteRef: '',
          receivedDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        loadData();
      } else {
        showNotification(res.message || 'Failed to receive goods', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleRecordInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.supplierName || !invoiceForm.invoiceNumber || invoiceForm.totalAmount <= 0) return;
    try {
      const res = await apiService.recordSupplierInvoice(invoiceForm);
      if (res.success) {
        showNotification(`Supplier Invoice ${res.data.invoiceNumber} recorded as UNPAID.`);
        setIsRecordInvoiceModalOpen(false);
        setInvoiceForm({
          supplierName: '',
          invoiceNumber: '',
          purchaseRequestId: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: '',
          totalAmount: 1000,
          taxAmount: 0,
          documentUrl: '',
          notes: ''
        });
        loadData();
      } else {
        showNotification(res.message || 'Failed to record invoice', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleDisbursePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || paymentForm.amount <= 0 || !paymentForm.paymentReference.trim()) return;
    try {
      const res = await apiService.disburseSupplierPayment(selectedInvoice.id, paymentForm);
      if (res.success) {
        showNotification(`Payment of KES ${paymentForm.amount.toLocaleString()} disbursed. Expense voucher posted.`);
        setIsPayInvoiceModalOpen(false);
        setSelectedInvoice(null);
        setPaymentForm({
          amount: 1000,
          paymentMethod: 'BANK',
          fundingAccount: 'BANK',
          paymentReference: '',
          paymentDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        loadData();
      } else {
        showNotification(res.message || 'Failed to disburse payment', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleReversePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !reversalForm.reason.trim()) return;
    try {
      const res = await apiService.reverseSupplierPayment(selectedInvoice.id, reversalForm.reason.trim());
      if (res.success) {
        showNotification(`Payment reversed. School financial account balance restored.`);
        setIsReversePaymentModalOpen(false);
        setSelectedInvoice(null);
        setReversalForm({ reason: '' });
        loadData();
      } else {
        showNotification(res.message || 'Failed to reverse payment', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleIssueStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.itemId || issueForm.quantity <= 0 || !issueForm.issuedTo.trim()) return;
    try {
      const res = await apiService.issueStock(issueForm);
      if (res.success) {
        showNotification(`Stock issued to ${issueForm.issuedTo}. Remaining: ${res.data.item.quantityInStock} ${res.data.item.unit}.`);
        setIsIssueStockModalOpen(false);
        setIssueForm({
          itemId: '',
          quantity: 1,
          issuedTo: '',
          purpose: '',
          reason: '',
          date: new Date().toISOString().split('T')[0]
        });
        loadData();
      } else {
        showNotification(res.message || 'Failed to issue stock', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.itemId || adjustForm.newQuantity < 0 || !adjustForm.reason.trim()) return;
    try {
      const res = await apiService.adjustStock(adjustForm);
      if (res.success) {
        showNotification(`Stock adjusted to ${res.data.item.quantityInStock} ${res.data.item.unit}.`);
        setIsAdjustStockModalOpen(false);
        setAdjustForm({
          itemId: '',
          newQuantity: 0,
          reason: '',
          date: new Date().toISOString().split('T')[0]
        });
        loadData();
      } else {
        showNotification(res.message || 'Failed to adjust stock', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleDisposeStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposeForm.itemId || disposeForm.quantity <= 0 || !disposeForm.reason.trim()) return;
    try {
      const res = await apiService.disposeStock(disposeForm);
      if (res.success) {
        showNotification(`Stock written off. Remaining: ${res.data.item.quantityInStock} ${res.data.item.unit}.`);
        setIsDisposeStockModalOpen(false);
        setDisposeForm({
          itemId: '',
          quantity: 1,
          isDamagedLost: true,
          reason: '',
          disposalOrderRef: '',
          date: new Date().toISOString().split('T')[0]
        });
        loadData();
      } else {
        showNotification(res.message || 'Failed to dispose stock', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.assetName || !assetForm.assetTag) return;
    try {
      const res = await apiService.addFixedAsset(assetForm);
      if (res.success) {
        showNotification(`Asset "${assetForm.assetName}" tagged successfully.`);
        setIsAddAssetModalOpen(false);
        setAssetForm({
          assetName: '',
          assetTag: '',
          category: 'FURNITURE_DESKS',
          purchaseDate: new Date().toISOString().split('T')[0],
          purchaseCost: 4500,
          location: 'Main Block',
          condition: 'EXCELLENT',
          assignedTo: ''
        });
        loadData();
      } else {
        showNotification(res.message || 'Failed to add asset', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce text-white ${
            notification.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {notification.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#500b1b] via-[#7a1228] to-[#991b36] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">verified_user</span>
            {user?.schoolName || 'Grace Seeds School'} · Stores, Inventory & Accounts Payable
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Stores, Procurement & Accounts Payable
          </h1>
          <p className="text-rose-100/90 text-sm mt-1 max-w-2xl">
            Multi-stage purchasing with separation of duties, goods receipt verification (GRN), double-entry accounts payable, and tamper-evident stock movements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setPrForm({
                itemId: items[0]?.id || '',
                quantityRequested: 10,
                estimatedUnitCost: items[0]?.unitCost || 100,
                reason: '',
                supportingDocumentUrl: '',
                supplierName: items[0]?.supplier || ''
              });
              setIsNewPRModalOpen(true);
            }}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">shopping_cart_checkout</span>
            Purchase Request
          </button>
          <button
            onClick={() => setIsAddItemModalOpen(true)}
            className="bg-white text-rose-900 hover:bg-rose-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">add_box</span>
            Add Stock Item
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Stock Valuation</span>
            <span className="material-symbols-outlined text-amber-600 text-lg">monetization_on</span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            KES {stats.totalValuation.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">{stats.totalItems} catalog items</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Low Stock Alerts</span>
            <span className="material-symbols-outlined text-rose-600 text-lg">warning</span>
          </div>
          <p className="text-xl font-bold text-rose-600 mt-2">{stats.lowStockCount}</p>
          <p className="text-xs text-slate-500 mt-1">At/below reorder limit</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Approvals</span>
            <span className="material-symbols-outlined text-blue-600 text-lg">pending_actions</span>
          </div>
          <p className="text-xl font-bold text-blue-600 mt-2">{stats.pendingPRCount}</p>
          <p className="text-xs text-slate-500 mt-1">Requires admin review</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Accounts Payable</span>
            <span className="material-symbols-outlined text-purple-600 text-lg">receipt_long</span>
          </div>
          <p className="text-xl font-bold text-purple-600 mt-2">
            KES {stats.totalAccountsPayable.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">{stats.unpaidInvoicesCount} unpaid invoices</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Fixed Assets</span>
            <span className="material-symbols-outlined text-emerald-600 text-lg">domain</span>
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-2">
            KES {stats.totalAssetsValuation.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">{stats.totalAssets} tagged assets</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'items'
              ? 'border-rose-700 text-rose-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">inventory_2</span>
          Stores Catalog ({filteredItems.length})
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'requests'
              ? 'border-rose-700 text-rose-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">assignment</span>
          Purchase Requests ({purchaseRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('grn')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'grn'
              ? 'border-rose-700 text-rose-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">inventory</span>
          Goods Receipts / GRN ({grns.length})
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'invoices'
              ? 'border-rose-700 text-rose-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">request_quote</span>
          Supplier Invoices & Payable ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'movements'
              ? 'border-rose-700 text-rose-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">history</span>
          Movement Audit Ledger ({movements.length})
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'assets'
              ? 'border-rose-700 text-rose-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">chair</span>
          Fixed Assets Register ({assets.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: STORES CATALOG & STOCK LEVELS                     */}
      {/* ======================================================== */}
      {activeTab === 'items' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4">
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <input
                type="text"
                placeholder="Search items or suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-slate-200 rounded-xl px-4 py-2 text-sm w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="ALL">All Categories</option>
                <option value="STATIONERY">Stationery</option>
                <option value="TEXTBOOKS">Textbooks</option>
                <option value="LAB_EQUIPMENT">Lab Equipment</option>
                <option value="KITCHEN_FOOD">Kitchen & Food</option>
                <option value="CLEANING">Cleaning & Sanitization</option>
                <option value="UNIFORMS">Uniforms</option>
                <option value="GENERAL_SUPPLIES">General Supplies</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIssueForm({ ...issueForm, itemId: items[0]?.id || '' });
                  setIsIssueStockModalOpen(true);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-base">output</span>
                Issue Stock
              </button>
              <button
                onClick={() => {
                  setAdjustForm({ ...adjustForm, itemId: items[0]?.id || '' });
                  setIsAdjustStockModalOpen(true);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-base">tune</span>
                Stocktake Adjust
              </button>
              <button
                onClick={() => {
                  setDisposeForm({ ...disposeForm, itemId: items[0]?.id || '' });
                  setIsDisposeStockModalOpen(true);
                }}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Write-Off / Disposal
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">In Stock</th>
                  <th className="py-3 px-4">Reorder Limit</th>
                  <th className="py-3 px-4">Unit Cost</th>
                  <th className="py-3 px-4">Valuation</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No stock items found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = item.quantityInStock <= item.reorderLevel;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{item.itemName}</td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{item.unit}</td>
                        <td className="py-3 px-4 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.quantityInStock}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{item.reorderLevel}</td>
                        <td className="py-3 px-4">KES {item.unitCost.toLocaleString()}</td>
                        <td className="py-3 px-4 font-semibold">
                          KES {(item.quantityInStock * item.unitCost).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{item.supplier || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setPrForm({
                                itemId: item.id,
                                quantityRequested: item.reorderLevel * 2,
                                estimatedUnitCost: item.unitCost,
                                reason: 'Restock order',
                                supportingDocumentUrl: '',
                                supplierName: item.supplier || ''
                              });
                              setIsNewPRModalOpen(true);
                            }}
                            className="text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold px-2.5 py-1 rounded-lg mr-2"
                          >
                            Reorder
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PURCHASE REQUESTS & APPROVAL WORKFLOW             */}
      {/* ======================================================== */}
      {activeTab === 'requests' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4">
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Purchase Requests & Approvals</h2>
              <p className="text-xs text-slate-500">
                Staff creates requisitions; authorized bursar/admin reviews and approves. Invariant: Creating or approving a request never alters inventory stock or available cash balance.
              </p>
            </div>
            <button
              onClick={() => {
                setPrForm({
                  itemId: items[0]?.id || '',
                  quantityRequested: 10,
                  estimatedUnitCost: items[0]?.unitCost || 100,
                  reason: '',
                  supportingDocumentUrl: '',
                  supplierName: items[0]?.supplier || ''
                });
                setIsNewPRModalOpen(true);
              }}
              className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              New Requisition
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Request #</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Qty Ordered</th>
                  <th className="py-3 px-4">Est. Cost</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4">Delivered</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {purchaseRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No purchase requests recorded yet.
                    </td>
                  </tr>
                ) : (
                  purchaseRequests.map((pr) => {
                    const isSelf = user?.id && pr.requestedByUserId === user.id;
                    const canApprove = pr.status === 'REQUESTED';
                    const canReceive = pr.status === 'APPROVED' || pr.status === 'PARTIALLY_DELIVERED';

                    return (
                      <tr key={pr.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{pr.requestNumber}</td>
                        <td className="py-3 px-4 font-semibold">{pr.itemName}</td>
                        <td className="py-3 px-4">{pr.quantityRequested}</td>
                        <td className="py-3 px-4">KES {pr.totalEstimatedCost.toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {pr.requestedByName}
                          {isSelf && (
                            <span className="ml-1 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {pr.deliveredQuantity} / {pr.quantityRequested}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              pr.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pr.status === 'REQUESTED'
                                ? 'bg-amber-100 text-amber-800'
                                : pr.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : pr.status === 'DELIVERED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {pr.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {canApprove && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedPR(pr);
                                  setIsApprovePRModalOpen(true);
                                }}
                                className="text-xs bg-emerald-600 text-white hover:bg-emerald-700 font-semibold px-2.5 py-1 rounded-lg"
                              >
                                Review & Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPR(pr);
                                  setIsRejectPRModalOpen(true);
                                }}
                                className="text-xs bg-rose-600 text-white hover:bg-rose-700 font-semibold px-2.5 py-1 rounded-lg"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {canReceive && (
                            <button
                              onClick={() => {
                                setGrnForm({
                                  purchaseRequestId: pr.id,
                                  quantityDelivered: pr.outstandingQuantity,
                                  quantityAccepted: pr.outstandingQuantity,
                                  quantityRejected: 0,
                                  rejectionReason: '',
                                  deliveryNoteRef: '',
                                  receivedDate: new Date().toISOString().split('T')[0],
                                  notes: ''
                                });
                                setIsReceiveGoodsModalOpen(true);
                              }}
                              className="text-xs bg-blue-600 text-white hover:bg-blue-700 font-semibold px-2.5 py-1 rounded-lg"
                            >
                              Receive Goods (GRN)
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: GOODS RECEIVED NOTES (GRN VERIFICATION)           */}
      {/* ======================================================== */}
      {activeTab === 'grn' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4">
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Goods Received Notes (GRN)</h2>
              <p className="text-xs text-slate-500">
                Official delivery inspection record. Stock on hand is incremented ONLY by actual accepted quantities.
              </p>
            </div>
            <button
              onClick={() => {
                const approvedPR = purchaseRequests.find((p) => p.status === 'APPROVED' || p.status === 'PARTIALLY_DELIVERED');
                if (approvedPR) {
                  setGrnForm({
                    purchaseRequestId: approvedPR.id,
                    quantityDelivered: approvedPR.outstandingQuantity,
                    quantityAccepted: approvedPR.outstandingQuantity,
                    quantityRejected: 0,
                    rejectionReason: '',
                    deliveryNoteRef: '',
                    receivedDate: new Date().toISOString().split('T')[0],
                    notes: ''
                  });
                }
                setIsReceiveGoodsModalOpen(true);
              }}
              className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">fact_check</span>
              Record Goods Received
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">GRN #</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Ordered</th>
                  <th className="py-3 px-4">Delivered</th>
                  <th className="py-3 px-4">Accepted (Stock In)</th>
                  <th className="py-3 px-4">Rejected</th>
                  <th className="py-3 px-4">Verified By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {grns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No Goods Received Notes issued yet.
                    </td>
                  </tr>
                ) : (
                  grns.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{g.grnNumber}</td>
                      <td className="py-3 px-4 font-semibold">{g.itemName}</td>
                      <td className="py-3 px-4">{g.quantityOrdered}</td>
                      <td className="py-3 px-4 font-medium">{g.quantityDelivered}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">+{g.quantityAccepted}</td>
                      <td className="py-3 px-4 text-rose-600">{g.quantityRejected || 0}</td>
                      <td className="py-3 px-4 text-slate-600">{g.receivedByName}</td>
                      <td className="py-3 px-4 text-slate-500">{g.receivedDate}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            g.deliveryStatus === 'FULL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : g.deliveryStatus === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {g.deliveryStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SUPPLIER INVOICES & ACCOUNTS PAYABLE              */}
      {/* ======================================================== */}
      {activeTab === 'invoices' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4">
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Supplier Invoices & Accounts Payable</h2>
              <p className="text-xs text-slate-500">
                Track supplier invoices. Disbursing payment generates an official expense voucher and deducts funds from the chosen school account.
              </p>
            </div>
            <button
              onClick={() => setIsRecordInvoiceModalOpen(true)}
              className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">receipt_long</span>
              Record Supplier Invoice
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Voucher</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No supplier invoices recorded yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-semibold">{inv.supplierName}</td>
                      <td className="py-3 px-4 text-slate-500">{inv.invoiceDate}</td>
                      <td className="py-3 px-4 font-bold">KES {inv.totalAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-emerald-700 font-medium">KES {inv.amountPaid.toLocaleString()}</td>
                      <td className="py-3 px-4 font-bold text-rose-600">KES {inv.balance.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            inv.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.paymentStatus === 'PARTIALLY_PAID'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{inv.voucherNumber || '—'}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {inv.balance > 0 && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentForm({
                                amount: inv.balance,
                                paymentMethod: 'BANK',
                                fundingAccount: 'BANK',
                                paymentReference: '',
                                paymentDate: new Date().toISOString().split('T')[0],
                                notes: ''
                              });
                              setIsPayInvoiceModalOpen(true);
                            }}
                            className="text-xs bg-emerald-600 text-white hover:bg-emerald-700 font-semibold px-2.5 py-1 rounded-lg"
                          >
                            Disburse Payment
                          </button>
                        )}
                        {inv.amountPaid > 0 && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setReversalForm({ reason: '' });
                              setIsReversePaymentModalOpen(true);
                            }}
                            className="text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold px-2.5 py-1 rounded-lg"
                          >
                            Reverse
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: STOCK MOVEMENTS & AUDIT LEDGER                    */}
      {/* ======================================================== */}
      {activeTab === 'movements' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4">
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Stock Movements & Audit Trail</h2>
              <p className="text-xs text-slate-500">
                Immutable chronological log of all stock movements: Goods receipts, teacher/kitchen requisitions, audit count adjustments, and write-offs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIssueForm({ ...issueForm, itemId: items[0]?.id || '' });
                  setIsIssueStockModalOpen(true);
                }}
                className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-base">output</span>
                Requisition Issue
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Balance Before</th>
                  <th className="py-3 px-4">Balance After</th>
                  <th className="py-3 px-4">Issued To / Recipient</th>
                  <th className="py-3 px-4">Reason / Remarks</th>
                  <th className="py-3 px-4">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No stock movement ledger records found.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-4 text-slate-500">{m.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{m.itemName}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            m.movementType === 'GOODS_RECEIVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.movementType === 'STOCK_ISSUE'
                              ? 'bg-blue-100 text-blue-800'
                              : m.movementType === 'STOCK_ADJUSTMENT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {m.movementType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold">
                        {m.quantity > 0 && m.movementType === 'GOODS_RECEIVED' ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{m.balanceBefore}</td>
                      <td className="py-3 px-4 font-semibold">{m.balanceAfter}</td>
                      <td className="py-3 px-4 text-slate-700">{m.issuedTo || '—'}</td>
                      <td className="py-3 px-4 text-slate-600 text-xs">{m.reason}</td>
                      <td className="py-3 px-4 text-slate-600 text-xs">{m.authorizedByName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: FIXED ASSETS REGISTER                             */}
      {/* ======================================================== */}
      {activeTab === 'assets' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4">
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Fixed Asset Register</h2>
              <p className="text-xs text-slate-500">
                Permanent institutional assets, serial tags, physical location, and condition audit.
              </p>
            </div>
            <button
              onClick={() => setIsAddAssetModalOpen(true)}
              className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Tag New Asset
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Asset Tag</th>
                  <th className="py-3 px-4">Asset Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Purchase Cost</th>
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4">Custodian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No fixed assets recorded in the register yet.
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{asset.assetTag}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{asset.assetName}</td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {asset.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{asset.location}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            asset.condition === 'EXCELLENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : asset.condition === 'GOOD'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {asset.condition}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold">KES {asset.purchaseCost.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-500">{asset.purchaseDate}</td>
                      <td className="py-3 px-4 text-slate-600">{asset.assignedTo || 'Unassigned'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD CATALOG ITEM                                */}
      {/* ======================================================== */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add Stock Item to Stores Catalog</h3>
              <button onClick={() => setIsAddItemModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Laboratory Reagents / Exercise Books"
                  value={itemForm.itemName}
                  onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value as any })}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    <option value="STATIONERY">Stationery</option>
                    <option value="TEXTBOOKS">Textbooks</option>
                    <option value="LAB_EQUIPMENT">Lab Equipment</option>
                    <option value="KITCHEN_FOOD">Kitchen & Food</option>
                    <option value="CLEANING">Cleaning & Sanitization</option>
                    <option value="UNIFORMS">Uniforms</option>
                    <option value="GENERAL_SUPPLIES">General Supplies</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure *</label>
                  <input
                    type="text"
                    required
                    placeholder="Pieces, Reams, Litres, Bags"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.quantityInStock}
                    onChange={(e) => setItemForm({ ...itemForm, quantityInStock: Number(e.target.value) })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reorder Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={itemForm.reorderLevel}
                    onChange={(e) => setItemForm({ ...itemForm, reorderLevel: Number(e.target.value) })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Cost (KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.unitCost}
                    onChange={(e) => setItemForm({ ...itemForm, unitCost: Number(e.target.value) })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Supplier</label>
                <input
                  type="text"
                  placeholder="e.g. Apex School Supplies Ltd"
                  value={itemForm.supplier}
                  onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  Save Stock Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CREATE PURCHASE REQUEST                         */}
      {/* ======================================================== */}
      {isNewPRModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">New Inventory Purchase Request</h3>
              <button onClick={() => setIsNewPRModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreatePurchaseRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Catalog Item *</label>
                <select
                  required
                  value={prForm.itemId}
                  onChange={(e) => {
                    const sel = items.find((i) => i.id === e.target.value);
                    setPrForm({
                      ...prForm,
                      itemId: e.target.value,
                      estimatedUnitCost: sel ? sel.unitCost : prForm.estimatedUnitCost,
                      supplierName: sel?.supplier || prForm.supplierName
                    });
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Choose Item --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.itemName} (In stock: {i.quantityInStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity Requested *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={prForm.quantityRequested}
                    onChange={(e) => setPrForm({ ...prForm, quantityRequested: Number(e.target.value) })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Unit Cost (KES) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={prForm.estimatedUnitCost}
                    onChange={(e) => setPrForm({ ...prForm, estimatedUnitCost: Number(e.target.value) })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between">
                <span className="font-semibold text-slate-700">Total Estimated Cost:</span>
                <span className="font-bold text-slate-900">
                  KES {(prForm.quantityRequested * prForm.estimatedUnitCost).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Reason *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this purchase is needed for learning or school operations..."
                  value={prForm.reason}
                  onChange={(e) => setPrForm({ ...prForm, reason: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Suggested Supplier</label>
                <input
                  type="text"
                  placeholder="Supplier name"
                  value={prForm.supplierName}
                  onChange={(e) => setPrForm({ ...prForm, supplierName: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewPRModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: APPROVE PURCHASE REQUEST (SEPARATION OF DUTIES) */}
      {/* ======================================================== */}
      {isApprovePRModalOpen && selectedPR && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Approve Purchase Request</h3>
              <button onClick={() => setIsApprovePRModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {user?.id && selectedPR.requestedByUserId === user.id ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <span className="material-symbols-outlined text-base">block</span>
                  Separation of Duties Policy
                </div>
                <p>
                  You submitted this purchase request ({selectedPR.requestedByName}). Under internal financial controls, you are prohibited from approving your own order. Another authorized administrative officer must review this request.
                </p>
                <div className="pt-2 text-right">
                  <button
                    onClick={() => setIsApprovePRModalOpen(false)}
                    className="bg-rose-600 text-white px-3 py-1.5 rounded-lg font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleApprovePR} className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-xl border space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order:</span>
                    <span className="font-mono font-bold">{selectedPR.requestNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Item:</span>
                    <span className="font-semibold">{selectedPR.itemName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Requested Qty:</span>
                    <span className="font-bold">{selectedPR.quantityRequested}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimated Total:</span>
                    <span className="font-bold text-slate-900">KES {selectedPR.totalEstimatedCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Requester:</span>
                    <span className="font-medium text-slate-700">{selectedPR.requestedByName}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Approved for Term 1 CBC science lab replenishment..."
                    value={prActionForm.notes}
                    onChange={(e) => setPrActionForm({ ...prActionForm, notes: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsApprovePRModalOpen(false)}
                    className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm"
                  >
                    Confirm Approval
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: REJECT PURCHASE REQUEST                         */}
      {/* ======================================================== */}
      {isRejectPRModalOpen && selectedPR && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Reject Purchase Request</h3>
              <button onClick={() => setIsRejectPRModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleRejectPR} className="space-y-4">
              <p className="text-xs text-slate-600">
                Are you sure you want to reject requisition <strong>{selectedPR.requestNumber}</strong> for {selectedPR.itemName}? Please provide an official justification.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rejection Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Current stock is sufficient for the rest of term; budget exceeded..."
                  value={prActionForm.reason}
                  onChange={(e) => setPrActionForm({ ...prActionForm, reason: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsRejectPRModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: RECEIVE GOODS NOTE (GRN)                        */}
      {/* ======================================================== */}
      {isReceiveGoodsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Goods Received Note (GRN) Inspection</h3>
              <button onClick={() => setIsReceiveGoodsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleReceiveGoods} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Purchase Request *</label>
                <select
                  required
                  value={grnForm.purchaseRequestId}
                  onChange={(e) => {
                    const pr = purchaseRequests.find((p) => p.id === e.target.value);
                    setGrnForm({
                      ...grnForm,
                      purchaseRequestId: e.target.value,
                      quantityDelivered: pr ? pr.outstandingQuantity : grnForm.quantityDelivered,
                      quantityAccepted: pr ? pr.outstandingQuantity : grnForm.quantityAccepted
                    });
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Select Approved Order --</option>
                  {purchaseRequests
                    .filter((p) => p.status === 'APPROVED' || p.status === 'PARTIALLY_DELIVERED')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.requestNumber} — {p.itemName} (Outstanding: {p.outstandingQuantity})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivered Qty *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={grnForm.quantityDelivered}
                    onChange={(e) => {
                      const del = Number(e.target.value);
                      setGrnForm({
                        ...grnForm,
                        quantityDelivered: del,
                        quantityAccepted: del - grnForm.quantityRejected
                      });
                    }}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Accepted Qty *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={grnForm.quantityAccepted}
                    onChange={(e) => {
                      const acc = Number(e.target.value);
                      setGrnForm({
                        ...grnForm,
                        quantityAccepted: acc,
                        quantityRejected: Math.max(0, grnForm.quantityDelivered - acc)
                      });
                    }}
                    className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rejected Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={grnForm.quantityRejected}
                    onChange={(e) => {
                      const rej = Number(e.target.value);
                      setGrnForm({
                        ...grnForm,
                        quantityRejected: rej,
                        quantityAccepted: Math.max(0, grnForm.quantityDelivered - rej)
                      });
                    }}
                    className="w-full border rounded-xl px-3 py-2 text-sm text-rose-600"
                  />
                </div>
              </div>

              {grnForm.quantityRejected > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">Rejection Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="Damaged goods, expired, incorrect specifications"
                    value={grnForm.rejectionReason}
                    onChange={(e) => setGrnForm({ ...grnForm, rejectionReason: e.target.value })}
                    className="w-full border border-rose-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Note Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. DN-9042"
                    value={grnForm.deliveryNoteRef}
                    onChange={(e) => setGrnForm({ ...grnForm, deliveryNoteRef: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Received Date *</label>
                  <input
                    type="date"
                    required
                    value={grnForm.receivedDate}
                    onChange={(e) => setGrnForm({ ...grnForm, receivedDate: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
                <strong>Inventory Impact:</strong> Only the accepted quantity ({grnForm.quantityAccepted}) will be added to the stock on hand and recorded in the audit trail.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsReceiveGoodsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  Verify & Process GRN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: RECORD SUPPLIER INVOICE                         */}
      {/* ======================================================== */}
      {isRecordInvoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Record Supplier Invoice</h3>
              <button onClick={() => setIsRecordInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleRecordInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Stationery Ltd"
                    value={invoiceForm.supplierName}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, supplierName: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-401"
                    value={invoiceForm.invoiceNumber}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Purchase Request (Optional)</label>
                <select
                  value={invoiceForm.purchaseRequestId}
                  onChange={(e) => {
                    const pr = purchaseRequests.find((p) => p.id === e.target.value);
                    setInvoiceForm({
                      ...invoiceForm,
                      purchaseRequestId: e.target.value,
                      totalAmount: pr ? pr.totalEstimatedCost : invoiceForm.totalAmount,
                      supplierName: pr?.supplierName || invoiceForm.supplierName
                    });
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- No Direct Link / Independent Invoice --</option>
                  {purchaseRequests.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.requestNumber} — {p.itemName} (KES {p.totalEstimatedCost.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.invoiceDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Amount (KES) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={invoiceForm.totalAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, totalAmount: Number(e.target.value) })}
                    className="w-full border rounded-xl px-3 py-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Amount (KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={invoiceForm.taxAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, taxAmount: Number(e.target.value) })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsRecordInvoiceModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  Save Payable Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 7: DISBURSE SUPPLIER PAYMENT (FINANCIAL OUTFLOW)   */}
      {/* ======================================================== */}
      {isPayInvoiceModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Disburse Supplier Payment</h3>
              <button onClick={() => setIsPayInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleDisbursePayment} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice:</span>
                  <span className="font-mono font-bold">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier:</span>
                  <span className="font-semibold">{selectedInvoice.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Invoice:</span>
                  <span className="font-semibold">KES {selectedInvoice.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding Balance:</span>
                  <span className="font-bold text-rose-600">KES {selectedInvoice.balance.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Amount (KES) *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedInvoice.balance}
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Funding Account *</label>
                  <select
                    value={paymentForm.fundingAccount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, fundingAccount: e.target.value as any })}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    <option value="BANK">School Bank Account</option>
                    <option value="MPESA">School M-Pesa Paybill / Till</option>
                    <option value="CASH">Cash Office</option>
                    <option value="CHEQUE">Bank Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    <option value="BANK">Bank Transfer / EFT</option>
                    <option value="MPESA">M-Pesa B2B / Till</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Petty Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Reference *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FT2609048 / CHQ-0418"
                    value={paymentForm.paymentReference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <strong>Financial Posting:</strong> This disbursement will automatically create a Payment Voucher and immediately reduce the school's <strong>{paymentForm.fundingAccount}</strong> available balance in the financial cash flow ledger.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPayInvoiceModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  Process Payment & Post Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 8: REVERSE SUPPLIER PAYMENT                        */}
      {/* ======================================================== */}
      {isReversePaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Reverse Supplier Payment</h3>
              <button onClick={() => setIsReversePaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleReversePayment} className="space-y-4">
              <p className="text-xs text-slate-600">
                This will reverse the paid amount of <strong>KES {selectedInvoice.amountPaid.toLocaleString()}</strong> for invoice <strong>{selectedInvoice.invoiceNumber}</strong>. The linked expense voucher will be cancelled and funds restored to the school ledger balance.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reversal Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Payment made to wrong supplier account; cheque was cancelled..."
                  value={reversalForm.reason}
                  onChange={(e) => setReversalForm({ reason: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsReversePaymentModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  Confirm Reversal & Restore Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 9: REQUISITION / ISSUE STOCK                       */}
      {/* ======================================================== */}
      {isIssueStockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Stock Requisition / Issue</h3>
              <button onClick={() => setIsIssueStockModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleIssueStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item to Issue *</label>
                <select
                  required
                  value={issueForm.itemId}
                  onChange={(e) => setIssueForm({ ...issueForm, itemId: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Choose Item --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.itemName} (Available: {i.quantityInStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Issue *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={issueForm.quantity}
                    onChange={(e) => setIssueForm({ ...issueForm, quantity: Number(e.target.value) })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Issued To / Recipient *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Science Dept / Teacher Jane / Kitchen"
                    value={issueForm.issuedTo}
                    onChange={(e) => setIssueForm({ ...issueForm, issuedTo: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 4 Integrated Science practical class"
                  value={issueForm.reason}
                  onChange={(e) => setIssueForm({ ...issueForm, reason: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsIssueStockModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  Confirm Stock Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 10: STOCK ADJUSTMENT / STOCKTAKE RECONCILIATION     */}
      {/* ======================================================== */}
      {isAdjustStockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Stocktake Count Adjustment</h3>
              <button onClick={() => setIsAdjustStockModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item *</label>
                <select
                  required
                  value={adjustForm.itemId}
                  onChange={(e) => {
                    const sel = items.find((i) => i.id === e.target.value);
                    setAdjustForm({
                      ...adjustForm,
                      itemId: e.target.value,
                      newQuantity: sel ? sel.quantityInStock : adjustForm.newQuantity
                    });
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Choose Item --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.itemName} (Current System Count: {i.quantityInStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Physical Stock Count *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustForm.newQuantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, newQuantity: Number(e.target.value) })}
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Justification *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. End of term physical stocktaking count reconciliation..."
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAdjustStockModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  Update Stock Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 11: DISPOSE / WRITE-OFF STOCK                      */}
      {/* ======================================================== */}
      {isDisposeStockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Stock Disposal / Write-Off</h3>
              <button onClick={() => setIsDisposeStockModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleDisposeStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item to Write Off *</label>
                <select
                  required
                  value={disposeForm.itemId}
                  onChange={(e) => setDisposeForm({ ...disposeForm, itemId: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Choose Item --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.itemName} (Available: {i.quantityInStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={disposeForm.quantity}
                    onChange={(e) => setDisposeForm({ ...disposeForm, quantity: Number(e.target.value) })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Disposal Order Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. DISP-2026-01"
                    value={disposeForm.disposalOrderRef}
                    onChange={(e) => setDisposeForm({ ...disposeForm, disposalOrderRef: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Disposal Reason / Remarks *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Expired chemical reagents safely destroyed according to NEMA guidelines..."
                  value={disposeForm.reason}
                  onChange={(e) => setDisposeForm({ ...disposeForm, reason: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsDisposeStockModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  Confirm Disposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 12: TAG FIXED ASSET                                */}
      {/* ======================================================== */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Tag & Register Institutional Fixed Asset</h3>
              <button onClick={() => setIsAddAssetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HP Desktop Computer / Teacher Desk"
                    value={assetForm.assetName}
                    onChange={(e) => setAssetForm({ ...assetForm, assetName: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Tag (Barcode/Tag) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GSS-IT-042"
                    value={assetForm.assetTag}
                    onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value as any })}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    <option value="FURNITURE_DESKS">Furniture & Desks</option>
                    <option value="COMPUTERS_IT">Computers & IT</option>
                    <option value="LAB_APPARATUS">Laboratory Apparatus</option>
                    <option value="SPORTS_EQUIPMENT">Sports Equipment</option>
                    <option value="AUDIO_VISUAL">Audio Visual & Multimedia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Science Lab 1 / Staff Room"
                    value={assetForm.location}
                    onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Cost (KES) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={assetForm.purchaseCost}
                    onChange={(e) => setAssetForm({ ...assetForm, purchaseCost: Number(e.target.value) })}
                    className="w-full border rounded-xl px-3 py-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={assetForm.purchaseDate}
                    onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Condition</label>
                  <select
                    value={assetForm.condition}
                    onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value as any })}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="NEEDS_REPAIR">Needs Repair</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Custodian / Assigned Staff</label>
                  <input
                    type="text"
                    placeholder="e.g. IT Department / Head of Science"
                    value={assetForm.assignedTo}
                    onChange={(e) => setAssetForm({ ...assetForm, assignedTo: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddAssetModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  Register Fixed Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagementView;
