import React, { useState } from 'react';
import { InventoryItem, StaffUser, INITIAL_INVENTORY_ITEMS } from '../../types/hotel';
import {
  logAuditEvent,
  sanitizeFirestoreData,
  fastSetDoc,
  fastDeleteDoc,
  fastBatchCommit,
} from '../../services/db';
import {
  Boxes,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  PackagePlus,
  Loader2,
  Edit3,
  Trash2,
  Search,
  RotateCcw,
} from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  staffUser: StaffUser;
}

type CategoryFilter = 'all' | 'linens' | 'toiletries' | 'cleaning' | 'beverages' | 'supplies';

export const InventorySuppliesManager: React.FC<Props> = ({ inventory, staffUser }) => {
  // Always ensure default items are visible even if Firestore inventory hasn't finished seeding
  const effectiveInventory =
    inventory && inventory.length > 0 ? inventory : INITIAL_INVENTORY_ITEMS;

  // Filter & Search state
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Stock Movement (In / Out) Modal State
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Manual Add / Edit Item Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<InventoryItem['category']>('linens');
  const [itemQty, setItemQty] = useState<number>(10);
  const [itemUnit, setItemUnit] = useState<string>('pcs');
  const [itemMinStock, setItemMinStock] = useState<number>(5);
  const [itemSaving, setItemSaving] = useState(false);

  // Delete confirmation modal
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const lowStockItems = effectiveInventory.filter(
    (item) => item.currentQuantity <= item.minStockLevel
  );

  const filteredItems = effectiveInventory.filter((item) => {
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenMovement = (item: InventoryItem, type: 'in' | 'out') => {
    setSelectedItem(item);
    setMovementType(type);
    setQuantity(1);
    setReason('');
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || quantity <= 0) return;

    setLoading(true);
    try {
      const newQty =
        movementType === 'in'
          ? selectedItem.currentQuantity + quantity
          : Math.max(0, selectedItem.currentQuantity - quantity);

      const now = new Date().toISOString();
      const movementId = `STK-${Date.now()}`;

      await fastBatchCommit([
        {
          type: 'set',
          collection: 'inventory',
          id: selectedItem.id,
          data: {
            ...selectedItem,
            currentQuantity: newQty,
            updatedAt: now,
          },
          merge: true,
        },
        {
          type: 'set',
          collection: 'stock_movements',
          id: movementId,
          data: {
            id: movementId,
            itemId: selectedItem.id,
            itemName: selectedItem.name,
            movementType,
            quantity,
            reason:
              reason.trim() ||
              (movementType === 'in' ? 'Routine procurement' : 'Issued for room turnover'),
            recordedByStaffName: staffUser.name || 'Hotel Staff',
            createdAt: now,
          },
          merge: false,
        },
      ]);

      logAuditEvent(
        'INVENTORY_UPDATED',
        'InventoryItem',
        selectedItem.id,
        `${movementType.toUpperCase()} of ${quantity} ${selectedItem.unit} for "${selectedItem.name}". New Stock: ${newQty}`,
        staffUser,
        reason
      ).catch(() => {});

      setStatusMessage(
        `Updated "${selectedItem.name}": ${movementType === 'in' ? '+' : '-'}${quantity} ${selectedItem.unit} (Current: ${newQty} ${selectedItem.unit})`
      );
      setTimeout(() => setStatusMessage(null), 4000);
      setSelectedItem(null);
    } catch (err: any) {
      console.error('Error updating stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory('linens');
    setItemQty(20);
    setItemUnit('pcs');
    setItemMinStock(5);
    setShowItemModal(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemQty(item.currentQuantity);
    setItemUnit(item.unit);
    setItemMinStock(item.minStockLevel);
    setShowItemModal(true);
  };

  const handleSaveManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    setItemSaving(true);
    try {
      const now = new Date().toISOString();
      const id = editingItem
        ? editingItem.id
        : `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const payload: InventoryItem = sanitizeFirestoreData({
        id,
        name: itemName.trim(),
        category: itemCategory,
        currentQuantity: Math.max(0, Number(itemQty) || 0),
        unit: itemUnit.trim() || 'pcs',
        minStockLevel: Math.max(0, Number(itemMinStock) || 0),
        updatedAt: now,
      });

      await fastSetDoc('inventory', id, payload, true);

      logAuditEvent(
        editingItem ? 'INVENTORY_ITEM_EDITED' : 'INVENTORY_ITEM_CREATED',
        'InventoryItem',
        id,
        `${editingItem ? 'Edited' : 'Added manual'} inventory item "${payload.name}" (${payload.category}) — Qty: ${payload.currentQuantity} ${payload.unit}`,
        staffUser
      ).catch(() => {});

      setStatusMessage(
        editingItem
          ? `Saved changes to "${payload.name}"!`
          : `Added new item "${payload.name}" (${payload.currentQuantity} ${payload.unit}) to inventory!`
      );
      setTimeout(() => setStatusMessage(null), 4000);
      setShowItemModal(false);
      setEditingItem(null);
    } catch (err: any) {
      console.error('Error saving manual inventory item:', err);
    } finally {
      setItemSaving(false);
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (!deletingItem) return;
    setDeleteLoading(true);
    try {
      await fastDeleteDoc('inventory', deletingItem.id);
      logAuditEvent(
        'INVENTORY_ITEM_DELETED',
        'InventoryItem',
        deletingItem.id,
        `Deleted inventory item "${deletingItem.name}"`,
        staffUser
      ).catch(() => {});
      setStatusMessage(`Deleted "${deletingItem.name}" from inventory.`);
      setTimeout(() => setStatusMessage(null), 4000);
      setDeletingItem(null);
    } catch (err: any) {
      console.error('Error deleting inventory item:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSeedDefaultSupplies = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      await fastBatchCommit(
        INITIAL_INVENTORY_ITEMS.map((item) => ({
          type: 'set' as const,
          collection: 'inventory',
          id: item.id,
          data: { ...item, updatedAt: now },
          merge: true,
        }))
      );
      setStatusMessage('Restored all default hotel linens & supplies!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Failed to restore default supplies:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner with Manual Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif-luxury text-white">
              Supplies & Linens Inventory
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Track bed sheets, pillows, towels, toiletries, RO drinking water cans, and add custom hotel supplies manually.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {lowStockItems.length > 0 && (
            <div className="bg-rose-950/50 border border-rose-800/70 px-3.5 py-2 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>{lowStockItems.length} item(s)</strong> low stock
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSeedDefaultSupplies}
            disabled={loading}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="Ensure all default hotel linens & supplies are loaded"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Sync Default Supplies</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
          >
            <PackagePlus className="w-4 h-4" />
            <span>+ Add New Supply / Linen Item</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Category Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'all', label: `All Items (${effectiveInventory.length})` },
              { id: 'linens', label: 'Linens & Bedding' },
              { id: 'toiletries', label: 'Toiletries' },
              { id: 'beverages', label: 'RO Water & Beverages' },
              { id: 'cleaning', label: 'Housekeeping & Cleaning' },
              { id: 'supplies', label: 'General Supplies' },
            ] as { id: CategoryFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search linen or supply..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const isLow = item.currentQuantity <= item.minStockLevel;
          return (
            <div
              key={item.id}
              className={`bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-sm transition-all flex flex-col justify-between ${
                isLow ? 'border-rose-800/80' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">{item.name}</h3>
                    <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block mt-0.5">
                      Category: {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isLow ? (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Low Stock
                      </span>
                    ) : (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        In Stock
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                      title="Edit Item Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      className="p-1.5 bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Current Stock</span>
                    <span className="text-2xl font-bold font-mono text-white">
                      {item.currentQuantity}{' '}
                      <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Minimum Alert Level</span>
                    <span className="text-xs font-mono text-slate-300 font-semibold">
                      {item.minStockLevel} {item.unit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenMovement(item, 'in')}
                  className="py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-emerald-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stock (In)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenMovement(item, 'out')}
                  className="py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-amber-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Issue (Use)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Manual Inventory Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold font-serif-luxury text-white flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-amber-400" />
                <span>
                  {editingItem ? 'Edit Supply / Linen Item' : 'Add New Supply / Linen Item'}
                </span>
              </h3>
            </div>

            <form onSubmit={handleSaveManualItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Item Name (e.g., Extra Blankets, Floor Cleaner, Dental Kits) *
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Enter item name..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Category *</label>
                  <select
                    value={itemCategory}
                    onChange={(e) =>
                      setItemCategory(e.target.value as InventoryItem['category'])
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="linens">Linens & Bedding</option>
                    <option value="toiletries">Toiletries</option>
                    <option value="cleaning">Cleaning & Housekeeping</option>
                    <option value="beverages">Beverages & RO Water</option>
                    <option value="supplies">General Hotel Supplies</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Measurement Unit *
                  </label>
                  <select
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="sets">Sets (sets)</option>
                    <option value="pairs">Pairs (pairs)</option>
                    <option value="bars">Bars (bars)</option>
                    <option value="cans">Cans (cans)</option>
                    <option value="bottles">Bottles (bottles)</option>
                    <option value="packets">Packets (packets)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="liters">Liters (liters)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Current Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemQty}
                    onChange={(e) => setItemQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Low Stock Alert Threshold *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemMinStock}
                    onChange={(e) => setItemMinStock(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowItemModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={itemSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  {itemSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{editingItem ? 'Save Changes' : 'Add to Inventory'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800/70 text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Delete Inventory Item?</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to remove <strong>{deletingItem.name}</strong> from your supplies list?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-xs hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                disabled={deleteLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement (In / Out) Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold font-serif-luxury text-white">
              {movementType === 'in'
                ? 'Record Stock Addition (In)'
                : 'Record Stock Usage (Out)'}
            </h3>
            <p className="text-xs text-slate-400">
              Item: <strong>{selectedItem.name}</strong> • Current Stock:{' '}
              {selectedItem.currentQuantity} {selectedItem.unit}
            </p>

            <form onSubmit={handleSaveMovement} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Quantity ({selectedItem.unit}) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Reason / Source / Room Assignment
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    movementType === 'in'
                      ? 'e.g. Local vendor delivery / fresh laundry delivery'
                      : 'e.g. Issued 4 sets for Rooms 101, 102 morning turnover'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Save Movement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
