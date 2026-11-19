import React, {useEffect, useState} from 'react';
import {X} from 'lucide-react';
import {DiscountType, InventoryItem, ItemCategory, UnitType} from '../types';
import {generateId} from '../utils/storage';

interface ItemModalProps {
  isOpen: boolean;
  editingItem?: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
}

const CATEGORIES: ItemCategory[] = ['Grocery', 'Medical', 'Dairy', 'Farming', 'General'];
const UNITS: UnitType[] = ['Kg', 'Gram', 'Litre', 'Packet', 'Dozen', 'Piece', 'Box'];
const GST_OPTIONS = [0, 5, 12, 18, 28];

export const ItemModal: React.FC<ItemModalProps> = ({isOpen, editingItem, onClose, onSave}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Grocery');
  const [unit, setUnit] = useState<UnitType>('Kg');
  const [salePrice, setSalePrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [gstPercent, setGstPercent] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState('0');
  const [stock, setStock] = useState('0');
  const [lowStockAlert, setLowStockAlert] = useState('10');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setName(editingItem.name);
      setCategory(editingItem.category);
      setUnit(editingItem.unit);
      setSalePrice(String(editingItem.salePrice));
      setPurchasePrice(String(editingItem.purchasePrice));
      setGstPercent(editingItem.gstPercent);
      setDiscountType(editingItem.discountType);
      setDiscountValue(String(editingItem.discountValue));
      setStock(String(editingItem.stock));
      setLowStockAlert(String(editingItem.lowStockAlert));
    } else {
      setName('');
      setCategory('Grocery');
      setUnit('Kg');
      setSalePrice('');
      setPurchasePrice('');
      setGstPercent(0);
      setDiscountType('percent');
      setDiscountValue('0');
      setStock('0');
      setLowStockAlert('10');
    }
    setError('');
  }, [isOpen, editingItem]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    const sPrice = parseFloat(salePrice) || 0;
    const pPrice = parseFloat(purchasePrice) || 0;
    if (sPrice < 0 || pPrice < 0) {
      setError('Prices cannot be negative.');
      return;
    }

    onSave({
      id: editingItem ? editingItem.id : generateId('item'),
      name: name.trim(),
      category,
      unit,
      salePrice: sPrice,
      purchasePrice: pPrice,
      gstPercent,
      discountType,
      discountValue: Math.max(0, parseFloat(discountValue) || 0),
      stock: Math.max(0, parseFloat(stock) || 0),
      lowStockAlert: Math.max(0, parseFloat(lowStockAlert) || 0),
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            {editingItem ? 'Edit Item' : 'Add New Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Item Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sharbati Wheat Flour, Dolo 650, Buffalo Milk"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitType)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sale Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Purchase Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Default GST %
              </label>
              <select
                value={gstPercent}
                onChange={(e) => setGstPercent(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              >
                {GST_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    GST {g}%
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Default Discount
              </label>
              <div className="flex rounded-xl border border-slate-300 overflow-hidden min-h-[44px]">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm tabular-nums text-slate-900 focus:outline-none"
                />
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                  className="bg-slate-100 border-l border-slate-300 px-2.5 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="percent">%</option>
                  <option value="flat">₹</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {editingItem ? 'Current Stock' : 'Opening Stock'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Low Stock Alert At
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={lowStockAlert}
                onChange={(e) => setLowStockAlert(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer min-h-[46px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer min-h-[46px]"
            >
              {editingItem ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
