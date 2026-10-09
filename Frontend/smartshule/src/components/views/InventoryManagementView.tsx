import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { InventoryItem, StockTransaction, FixedAsset } from '../../types';

export const InventoryManagementView: React.FC = () => {
 const [activeTab, setActiveTab] = useState<'items' | 'transactions' | 'assets'>('items');
 const [items, setItems] = useState<InventoryItem[]>([]);
 const [transactions, setTransactions] = useState<StockTransaction[]>([]);
 const [assets, setAssets] = useState<FixedAsset[]>([]);
 const [loading, setLoading] = useState(true);
 const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
 const [searchQuery, setSearchQuery] = useState('');
 const [notification, setNotification] = useState<string | null>(null);

 // Modals
 const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
 const [isStockTxModalOpen, setIsStockTxModalOpen] = useState(false);
 const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
 const [selectedItemForTx, setSelectedItemForTx] = useState<InventoryItem | null>(null);

 // Forms
 const [itemForm, setItemForm] = useState({
 itemName: '',
 category: 'STATIONERY' as InventoryItem['category'],
 unit: 'Pieces',
 quantityInStock: 50,
 reorderLevel: 10,
 unitCost: 150,
 supplier: '',
 notes: '',
 });

 const [txForm, setTxForm] = useState({
 itemId: '',
 type: 'STOCK_OUT' as StockTransaction['type'],
 quantity: 1,
 issuedTo: '',
 authorizedBy: 'Store Keeper',
 notes: '',
 });

 const [assetForm, setAssetForm] = useState({
 assetName: '',
 assetTag: '',
 category: 'FURNITURE_DESKS' as FixedAsset['category'],
 purchaseDate: new Date().toISOString().split('T')[0],
 purchaseCost: 4500,
 location: 'Main Block',
 condition: 'EXCELLENT' as FixedAsset['condition'],
 assignedTo: '',
 });

 const showNotification = (msg: string) => {
 setNotification(msg);
 setTimeout(() => setNotification(null), 4000);
 };

 const loadData = async () => {
 setLoading(true);
 try {
 const [itemsRes, txRes, assetsRes] = await Promise.all([
 apiService.getInventoryItems(),
 apiService.getStockTransactions(),
 apiService.getFixedAssets(),
 ]);
 if (itemsRes?.data) setItems(itemsRes.data);
 if (txRes?.data) setTransactions(txRes.data);
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

 return {
 totalItems,
 totalValuation,
 lowStockCount: lowStockItems.length,
 lowStockItems,
 totalAssets: assets.length,
 totalAssetsValuation,
 };
 }, [items, assets]);

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

 const handleAddItem = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!itemForm.itemName) return;
 try {
 const res = await apiService.addInventoryItem(itemForm);
 if (res.success) {
 showNotification(`Item "${itemForm.itemName}" added to catalog`);
 setIsAddItemModalOpen(false);
 setItemForm({
 itemName: '',
 category: 'STATIONERY',
 unit: 'Pieces',
 quantityInStock: 50,
 reorderLevel: 10,
 unitCost: 150,
 supplier: '',
 notes: '',
 });
 loadData();
 } else {
 alert(res.message || 'Failed to add item');
 }
 } catch (err: any) {
 alert(`Error adding item: ${err.message}`);
 }
 };

 const handleStockTx = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!txForm.itemId || txForm.quantity <= 0) return;
 try {
 const res = await apiService.recordStockTransaction(txForm);
 if (res.success) {
 showNotification(`Stock ${txForm.type === 'STOCK_IN' ? 'received' : 'issued'} successfully`);
 setIsStockTxModalOpen(false);
 setSelectedItemForTx(null);
 setTxForm({
 itemId: '',
 type: 'STOCK_OUT',
 quantity: 1,
 issuedTo: '',
 authorizedBy: 'Store Keeper',
 notes: '',
 });
 loadData();
 } else {
 alert(res.message || 'Failed to record stock transaction');
 }
 } catch (err: any) {
 alert(`Error recording transaction: ${err.message}`);
 }
 };

 const handleAddAsset = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!assetForm.assetName || !assetForm.assetTag) return;
 try {
 const res = await apiService.addFixedAsset(assetForm);
 if (res.success) {
 showNotification(`Asset "${assetForm.assetName}" tagged successfully`);
 setIsAddAssetModalOpen(false);
 setAssetForm({
 assetName: '',
 assetTag: '',
 category: 'FURNITURE_DESKS',
 purchaseDate: new Date().toISOString().split('T')[0],
 purchaseCost: 4500,
 location: 'Main Block',
 condition: 'EXCELLENT',
 assignedTo: '',
 });
 loadData();
 } else {
 alert(res.message || 'Failed to add asset');
 }
 } catch (err: any) {
 alert(`Error tagging asset: ${err.message}`);
 }
 };

 const handleDeleteItem = async (id: string, name: string) => {
 if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
 try {
 const res = await apiService.deleteInventoryItem(id);
 if (res.success) {
 showNotification(`${name} deleted from catalog`);
 loadData();
 }
 } catch (err: any) {
 alert(`Failed to delete: ${err.message}`);
 }
 };

 const handleDeleteAsset = async (id: string, name: string) => {
 if (!window.confirm(`Are you sure you want to retire asset ${name}?`)) return;
 try {
 const res = await apiService.deleteFixedAsset(id);
 if (res.success) {
 showNotification(`Asset ${name} retired`);
 loadData();
 }
 } catch (err: any) {
 alert(`Failed to retire asset: ${err.message}`);
 }
 };

 return (
 <div className="space-y-6">
 {/* Toast Notification */}
 {notification && (
 <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
 <span className="material-symbols-outlined text-lg">check_circle</span>
 <span className="text-sm font-semibold">{notification}</span>
 </div>
 )}

 {/* Header Banner */}
 <div className="bg-gradient-to-r from-[#500b1b] via-[#7a1228] to-[#991b36] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2 text-rose-200 text-xs font-semibold uppercase tracking-wider mb-1">
 <span className="material-symbols-outlined text-base">inventory</span>
 Procurement, Stores & Fixed Asset Register
 </div>
 <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Stores, Supplies & Asset Tracking</h1>
 <p className="text-rose-100/90 text-sm mt-1 max-w-2xl">
 Real-time stock valuation, consumable requisitions, minimum threshold alerts, and institutional fixed asset auditing.
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <button
 onClick={() => {
 setTxForm({ ...txForm, itemId: items[0]?.id || '', type: 'STOCK_OUT' });
 setIsStockTxModalOpen(true);
 }}
 className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-sm"
 >
 <span className="material-symbols-outlined text-lg">output</span>
 Stock Requisition
 </button>
 <button
 onClick={() => setIsAddItemModalOpen(true)}
 className="bg-white text-amber-900 hover:bg-amber-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
 >
 <span className="material-symbols-outlined text-lg">add_box</span>
 Add Stock Item
 </button>
 </div>
 </div>

 {/* Metric Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Stock Valuation</span>
 <span className="material-symbols-outlined text-amber-600 text-lg">monetization_on</span>
 </div>
 <p className="text-2xl font-bold text-slate-900 mt-2">
 KES {stats.totalValuation.toLocaleString()}
 </p>
 <p className="text-xs text-slate-500 mt-1">{stats.totalItems} catalog items</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Low Stock Alerts</span>
 <span className="material-symbols-outlined text-rose-600 text-lg">warning</span>
 </div>
 <p className="text-2xl font-bold text-rose-600 mt-2">
 {stats.lowStockCount}
 </p>
 <p className="text-xs text-slate-500 mt-1">Items at or below reorder limit</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Fixed Assets Value</span>
 <span className="material-symbols-outlined text-blue-600 text-lg">domain</span>
 </div>
 <p className="text-2xl font-bold text-blue-600 mt-2">
 KES {stats.totalAssetsValuation.toLocaleString()}
 </p>
 <p className="text-xs text-slate-500 mt-1">{stats.totalAssets} tagged assets</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Stock Movements</span>
 <span className="material-symbols-outlined text-emerald-600 text-lg">sync_alt</span>
 </div>
 <p className="text-2xl font-bold text-slate-900 mt-2">
 {transactions.length}
 </p>
 <p className="text-xs text-slate-500 mt-1">Audit transactions logged</p>
 </div>
 </div>

 {/* Sub Tabs */}
 <div className="flex items-center gap-2 border-b border-slate-200 ">
 <button
 onClick={() => setActiveTab('items')}
 className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
 activeTab === 'items'
 ? 'border-amber-700 text-amber-800'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
 >
 <span className="material-symbols-outlined text-lg">inventory_2</span>
 Supplies & Consumables ({filteredItems.length})
 </button>

 <button
 onClick={() => setActiveTab('transactions')}
 className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
 activeTab === 'transactions'
 ? 'border-amber-700 text-amber-800'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
 >
 <span className="material-symbols-outlined text-lg">history</span>
 Movement Ledger ({transactions.length})
 </button>

 <button
 onClick={() => setActiveTab('assets')}
 className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
 activeTab === 'assets'
 ? 'border-amber-700 text-amber-800'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
 >
 <span className="material-symbols-outlined text-lg">chair</span>
 Fixed Assets Register ({assets.length})
 </button>
 </div>

 {/* TAB 1: CONSUMABLES & ITEMS */}
 {activeTab === 'items' && (
 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4">
 {/* Low Stock Banner */}
 {stats.lowStockCount > 0 && (
 <div className="bg-rose-50 border-b border-rose-200 p-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <span className="material-symbols-outlined text-rose-600 text-2xl">warning</span>
 <div>
 <h4 className="text-sm font-bold text-rose-900 ">
 Low Stock Threshold Warning ({stats.lowStockCount} items)
 </h4>
 <p className="text-xs text-rose-700 ">
 Items needing immediate reorder:{' '}
 {stats.lowStockItems.map((i) => `${i.itemName} (${i.quantityInStock} ${i.unit})`).join(', ')}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Filters Bar */}
 <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 ">
 <div className="flex flex-wrap items-center gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
 <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value)}
 className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 "
 >
 <option value="ALL">All Categories</option>
 <option value="STATIONERY">Stationery & Printing</option>
 <option value="TEXTBOOKS">Textbooks & Readers</option>
 <option value="LAB_EQUIPMENT">Lab Science Equipment</option>
 <option value="KITCHEN_FOOD">Kitchen & Boarding Food</option>
 <option value="CLEANING">Sanitation & Cleaning</option>
 <option value="UNIFORMS">School Uniforms</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Search Catalog</label>
 <div className="relative">
 <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-sm">search</span>
 <input
 type="text"
 placeholder="Search item or supplier..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 "
 />
 </div>
 </div>
 </div>

 <div className="text-xs text-slate-500">
 Showing <span className="font-bold text-slate-800 ">{filteredItems.length}</span> items
 </div>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 {loading ? (
 <div className="p-12 text-center text-slate-500">
 <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-amber-700">progress_activity</span>
 <p>Loading inventory...</p>
 </div>
 ) : filteredItems.length === 0 ? (
 <div className="p-12 text-center">
 <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">inventory_2</span>
 <p className="text-slate-600 font-medium">No items found in this category.</p>
 </div>
 ) : (
 <table className="w-full text-left text-sm text-slate-700 ">
 <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 ">
 <tr>
 <th className="px-4 py-3">Item Description</th>
 <th className="px-4 py-3">Category</th>
 <th className="px-4 py-3">Stock Level</th>
 <th className="px-4 py-3">Unit Cost</th>
 <th className="px-4 py-3">Total Value</th>
 <th className="px-4 py-3">Supplier</th>
 <th className="px-4 py-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {filteredItems.map((item) => {
 const isLow = item.quantityInStock <= item.reorderLevel;
 return (
 <tr key={item.id} className="hover:bg-slate-50/60 ">
 <td className="px-4 py-3">
 <div className="font-semibold text-slate-900 ">{item.itemName}</div>
 <div className="text-xs text-slate-400">Unit: {item.unit}</div>
 </td>
 <td className="px-4 py-3">
 <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 ">
 {item.category}
 </span>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <span
 className={`font-bold font-mono text-sm ${
 isLow ? 'text-rose-600' : 'text-slate-900' 
 }`}
 >
 {item.quantityInStock} {item.unit}
 </span>
 {isLow && (
 <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
 Low &lt; {item.reorderLevel}
 </span>
 )}
 </div>
 </td>
 <td className="px-4 py-3 text-xs font-medium">KES {item.unitCost?.toLocaleString()}</td>
 <td className="px-4 py-3 font-semibold text-slate-900 ">
 KES {(item.quantityInStock * (item.unitCost || 0)).toLocaleString()}
 </td>
 <td className="px-4 py-3 text-xs text-slate-500">{item.supplier || '--'}</td>
 <td className="px-4 py-3 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <button
 onClick={() => {
 setSelectedItemForTx(item);
 setTxForm({ ...txForm, itemId: item.id, type: 'STOCK_IN' });
 setIsStockTxModalOpen(true);
 }}
 title="Receive Stock"
 className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold"
 >
 + Stock
 </button>
 <button
 onClick={() => {
 setSelectedItemForTx(item);
 setTxForm({ ...txForm, itemId: item.id, type: 'STOCK_OUT' });
 setIsStockTxModalOpen(true);
 }}
 title="Issue Stock"
 className="px-2 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold"
 >
 - Issue
 </button>
 <button
 onClick={() => handleDeleteItem(item.id, item.itemName)}
 className="p-1 text-slate-400 hover:text-rose-600 rounded"
 >
 <span className="material-symbols-outlined text-base">delete</span>
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 )}
 </div>
 </div>
 )}

 {/* TAB 2: TRANSACTIONS AUDIT LEDGER */}
 {activeTab === 'transactions' && (
 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-base font-bold text-slate-900 ">Stock Requisitions & Receipts Ledger</h3>
 <p className="text-xs text-slate-500">Immutable ledger of consumables dispatched to departments or received from suppliers.</p>
 </div>
 </div>

 <div className="overflow-x-auto">
 {transactions.length === 0 ? (
 <div className="p-12 text-center">
 <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">swap_horiz</span>
 <p className="text-slate-600 font-medium">No stock transactions registered.</p>
 </div>
 ) : (
 <table className="w-full text-left text-sm text-slate-700 ">
 <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 ">
 <tr>
 <th className="px-4 py-3">Date</th>
 <th className="px-4 py-3">Item Name</th>
 <th className="px-4 py-3">Movement Type</th>
 <th className="px-4 py-3">Quantity</th>
 <th className="px-4 py-3">Issued To / Dept</th>
 <th className="px-4 py-3">Authorized By</th>
 <th className="px-4 py-3">Notes</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {transactions.map((tx) => (
 <tr key={tx.id} className="hover:bg-slate-50/50 ">
 <td className="px-4 py-3 text-xs font-mono">{tx.date || tx.createdAt?.slice(0, 10)}</td>
 <td className="px-4 py-3 font-semibold text-slate-900 ">{tx.itemName}</td>
 <td className="px-4 py-3">
 {tx.type === 'STOCK_IN' ? (
 <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 ">
 ↓ Stock Received
 </span>
 ) : (
 <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 ">
 ↑ Stock Issued
 </span>
 )}
 </td>
 <td className="px-4 py-3 font-mono font-bold text-sm">{tx.quantity}</td>
 <td className="px-4 py-3 text-xs">{tx.issuedTo || 'General Store'}</td>
 <td className="px-4 py-3 text-xs font-medium text-slate-600 ">
 {tx.authorizedBy}
 </td>
 <td className="px-4 py-3 text-xs text-slate-500">{tx.notes || '--'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </div>
 )}

 {/* TAB 3: FIXED ASSETS */}
 {activeTab === 'assets' && (
 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-base font-bold text-slate-900 ">Institutional Fixed Asset Register</h3>
 <p className="text-xs text-slate-500">Track desks, lab apparatus, computers, AV equipment, and physical school property.</p>
 </div>
 <button
 onClick={() => setIsAddAssetModalOpen(true)}
 className="bg-amber-800 hover:bg-amber-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
 >
 <span className="material-symbols-outlined text-base">add</span>
 Tag Fixed Asset
 </button>
 </div>

 <div className="overflow-x-auto">
 {assets.length === 0 ? (
 <div className="p-12 text-center">
 <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">chair</span>
 <p className="text-slate-600 font-medium">No fixed assets registered.</p>
 </div>
 ) : (
 <table className="w-full text-left text-sm text-slate-700 ">
 <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 ">
 <tr>
 <th className="px-4 py-3">Asset Tag</th>
 <th className="px-4 py-3">Asset Description</th>
 <th className="px-4 py-3">Category</th>
 <th className="px-4 py-3">Location / Room</th>
 <th className="px-4 py-3">Purchase Cost</th>
 <th className="px-4 py-3">Condition</th>
 <th className="px-4 py-3">Assigned To</th>
 <th className="px-4 py-3 text-right">Retire</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {assets.map((a) => (
 <tr key={a.id} className="hover:bg-slate-50/50 ">
 <td className="px-4 py-3 font-mono font-bold text-xs text-amber-800 ">
 {a.assetTag}
 </td>
 <td className="px-4 py-3 font-semibold text-slate-900 ">{a.assetName}</td>
 <td className="px-4 py-3 text-xs">{a.category}</td>
 <td className="px-4 py-3 text-xs font-medium">{a.location}</td>
 <td className="px-4 py-3 font-mono text-xs">KES {a.purchaseCost?.toLocaleString()}</td>
 <td className="px-4 py-3">
 <span
 className={`px-2 py-0.5 rounded text-xs font-bold ${
 a.condition === 'EXCELLENT'
 ? 'bg-emerald-100 text-emerald-800'
 : a.condition === 'GOOD'
 ? 'bg-blue-100 text-blue-800'
 : a.condition === 'NEEDS_REPAIR'
 ? 'bg-amber-100 text-amber-800'
 : 'bg-rose-100 text-rose-800'
 }`}
 >
 {a.condition}
 </span>
 </td>
 <td className="px-4 py-3 text-xs text-slate-500">{a.assignedTo || '--'}</td>
 <td className="px-4 py-3 text-right">
 <button
 onClick={() => handleDeleteAsset(a.id, a.assetName)}
 className="p-1 text-slate-400 hover:text-rose-600 rounded"
 >
 <span className="material-symbols-outlined text-base">delete</span>
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </div>
 )}

 {/* MODAL: ADD INVENTORY ITEM */}
 {isAddItemModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-bold text-slate-900 mb-3">Add Consumable Stock Item</h3>
 <form onSubmit={handleAddItem} className="space-y-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Item Name</label>
 <input
 type="text"
 required
 placeholder="e.g., A4 Printing Paper Reams (Chamex)"
 value={itemForm.itemName}
 onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
 <select
 value={itemForm.category}
 onChange={(e: any) => setItemForm({ ...itemForm, category: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 <option value="STATIONERY">Stationery & Printing</option>
 <option value="TEXTBOOKS">Textbooks & Readers</option>
 <option value="LAB_EQUIPMENT">Lab Science Equipment</option>
 <option value="KITCHEN_FOOD">Kitchen & Boarding Food</option>
 <option value="CLEANING">Sanitation & Cleaning</option>
 <option value="UNIFORMS">School Uniforms</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Unit of Measure</label>
 <input
 type="text"
 placeholder="Reams, Bags, Pcs, Kgs..."
 value={itemForm.unit}
 onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 </div>

 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Initial Stock</label>
 <input
 type="number"
 min="0"
 required
 value={itemForm.quantityInStock}
 onChange={(e) => setItemForm({ ...itemForm, quantityInStock: Number(e.target.value) })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Reorder Limit</label>
 <input
 type="number"
 min="1"
 required
 value={itemForm.reorderLevel}
 onChange={(e) => setItemForm({ ...itemForm, reorderLevel: Number(e.target.value) })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Unit Cost (KES)</label>
 <input
 type="number"
 min="0"
 value={itemForm.unitCost}
 onChange={(e) => setItemForm({ ...itemForm, unitCost: Number(e.target.value) })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Supplier / Vendor</label>
 <input
 type="text"
 placeholder="e.g., Text Book Centre / Brookside"
 value={itemForm.supplier}
 onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div className="flex justify-end gap-3 pt-3 border-t">
 <button
 type="button"
 onClick={() => setIsAddItemModalOpen(false)}
 className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl"
 >
 Add Item
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* MODAL: STOCK REQUISITION / RECEIPT */}
 {isStockTxModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
 <h3 className="text-lg font-bold text-slate-900 mb-2">Record Stock Movement</h3>
 <form onSubmit={handleStockTx} className="space-y-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Select Item</label>
 <select
 value={txForm.itemId}
 onChange={(e) => setTxForm({ ...txForm, itemId: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 {items.map((i) => (
 <option key={i.id} value={i.id}>
 {i.itemName} (Available: {i.quantityInStock} {i.unit})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Transaction Type</label>
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => setTxForm({ ...txForm, type: 'STOCK_OUT' })}
 className={`py-2 rounded-xl text-xs font-bold border ${
 txForm.type === 'STOCK_OUT'
 ? 'bg-amber-600 text-white border-amber-600'
 : 'border-slate-300 text-slate-700'
 }`}
 >
 Stock Out (Issue)
 </button>
 <button
 type="button"
 onClick={() => setTxForm({ ...txForm, type: 'STOCK_IN' })}
 className={`py-2 rounded-xl text-xs font-bold border ${
 txForm.type === 'STOCK_IN'
 ? 'bg-emerald-600 text-white border-emerald-600'
 : 'border-slate-300 text-slate-700'
 }`}
 >
 Stock In (Receive)
 </button>
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
 <input
 type="number"
 min="1"
 required
 value={txForm.quantity}
 onChange={(e) => setTxForm({ ...txForm, quantity: Number(e.target.value) })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Issued To / Department</label>
 <input
 type="text"
 placeholder="e.g., Grade 3 Stream, Science Dept, Kitchen"
 value={txForm.issuedTo}
 onChange={(e) => setTxForm({ ...txForm, issuedTo: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Authorized By</label>
 <input
 type="text"
 value={txForm.authorizedBy}
 onChange={(e) => setTxForm({ ...txForm, authorizedBy: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div className="flex justify-end gap-3 pt-3 border-t">
 <button
 type="button"
 onClick={() => setIsStockTxModalOpen(false)}
 className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl"
 >
 Save Transaction
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* MODAL: TAG FIXED ASSET */}
 {isAddAssetModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-bold text-slate-900 mb-3">Tag School Fixed Asset</h3>
 <form onSubmit={handleAddAsset} className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Asset Tag Number</label>
 <input
 type="text"
 required
 placeholder="e.g., SCH-DESK-042"
 value={assetForm.assetTag}
 onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono text-slate-900 "
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Asset Name</label>
 <input
 type="text"
 required
 placeholder="e.g., Student Double Locker Desk"
 value={assetForm.assetName}
 onChange={(e) => setAssetForm({ ...assetForm, assetName: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
 <select
 value={assetForm.category}
 onChange={(e: any) => setAssetForm({ ...assetForm, category: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 <option value="FURNITURE_DESKS">Furniture & Desks</option>
 <option value="COMPUTERS_IT">Computers & IT Hardware</option>
 <option value="LAB_APPARATUS">Laboratory Apparatus</option>
 <option value="SPORTS_EQUIPMENT">Sports & Gym Equipment</option>
 <option value="AUDIO_VISUAL">Projectors & Audio Visual</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Physical Location</label>
 <input
 type="text"
 placeholder="e.g., Grade 5 East / Science Lab 2"
 value={assetForm.location}
 onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Purchase Cost (KES)</label>
 <input
 type="number"
 min="0"
 value={assetForm.purchaseCost}
 onChange={(e) => setAssetForm({ ...assetForm, purchaseCost: Number(e.target.value) })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Condition</label>
 <select
 value={assetForm.condition}
 onChange={(e: any) => setAssetForm({ ...assetForm, condition: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 <option value="EXCELLENT">Excellent</option>
 <option value="GOOD">Good</option>
 <option value="NEEDS_REPAIR">Needs Repair</option>
 <option value="DAMAGED">Damaged</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Assigned Custodian / Staff</label>
 <input
 type="text"
 placeholder="e.g., Mr. David - Science Teacher"
 value={assetForm.assignedTo}
 onChange={(e) => setAssetForm({ ...assetForm, assignedTo: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div className="flex justify-end gap-3 pt-3 border-t">
 <button
 type="button"
 onClick={() => setIsAddAssetModalOpen(false)}
 className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl"
 >
 Tag Asset
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
