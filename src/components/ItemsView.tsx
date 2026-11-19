import React, {useMemo, useState} from 'react';
import {AlertTriangle, Edit3, PackagePlus, Search, Trash2} from 'lucide-react';
import {InventoryItem, ItemCategory, UnitType} from '../types';
import {formatINR} from '../utils/formatters';

interface ItemsViewProps {
  items: InventoryItem[];
  onAddItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
}

const CATEGORIES: Array<'All' | ItemCategory> = [
  'All',
  'Grocery',
  'Medical',
  'Dairy',
  'Farming',
  'General',
];
const UNITS: Array<'All' | UnitType> = [
  'All',
  'Kg',
  'Gram',
  'Litre',
  'Packet',
  'Dozen',
  'Piece',
  'Box',
];

export const ItemsView: React.FC<ItemsViewProps> = ({
  items,
  onAddItem,
  onEditItem,
  onDeleteItem,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ItemCategory>('All');
  const [unitFilter, setUnitFilter] = useState<'All' | UnitType>('All');

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryFilter !== 'All' && it.category !== categoryFilter) return false;
      if (unitFilter !== 'All' && it.unit !== unitFilter) return false;
      if (q) {
        return (
          it.name.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          it.unit.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, search, categoryFilter, unitFilter]);

  const lowStockCount = useMemo(
    () => items.filter((it) => it.stock <= it.lowStockAlert).length,
    [items]
  );

  return (
    <div className="space-y-5">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Inventory &amp; Product Catalog</h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {items.length} items · {lowStockCount} low stock alerts
          </p>
        </div>

        <button
          type="button"
          onClick={onAddItem}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer min-h-[44px] whitespace-nowrap"
        >
          <PackagePlus className="w-4 h-4" />
          <span>Add New Item</span>
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items by name, category, or unit..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              aria-label="Filter by category"
              onChange={(e) => setCategoryFilter(e.target.value as 'All' | ItemCategory)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={unitFilter}
              aria-label="Filter by unit"
              onChange={(e) => setUnitFilter(e.target.value as 'All' | UnitType)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u === 'All' ? 'All Units' : `Unit: ${u}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Items List */}
        {filteredItems.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500">
                    <th className="py-2.5 pr-3">Item Name</th>
                    <th className="py-2.5 px-3">Category · Unit</th>
                    <th className="py-2.5 px-3 text-right">Sale Price</th>
                    <th className="py-2.5 px-3 text-right">Purchase Price</th>
                    <th className="py-2.5 px-3 text-right">GST · Disc</th>
                    <th className="py-2.5 px-3 text-right">Stock</th>
                    <th className="py-2.5 pl-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredItems.map((it) => {
                    const isLow = it.stock <= it.lowStockAlert;
                    return (
                      <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pr-3 font-semibold text-slate-900">{it.name}</td>
                        <td className="py-3 px-3 text-xs text-slate-600">
                          {it.category} · {it.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums text-emerald-700">
                          {formatINR(it.salePrice, true)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                          {formatINR(it.purchasePrice, true)}
                        </td>
                        <td className="py-3 px-3 text-right text-xs tabular-nums text-slate-600">
                          {it.gstPercent}% ·{' '}
                          {it.discountValue > 0
                            ? it.discountType === 'percent'
                              ? `${it.discountValue}%`
                              : formatINR(it.discountValue)
                            : '0'}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                            <span
                              className={`font-semibold ${
                                isLow ? 'text-amber-700' : 'text-slate-900'
                              }`}
                            >
                              {it.stock} {it.unit}
                            </span>
                          </div>
                          {isLow && (
                            <p className="text-[11px] font-semibold text-amber-700">Low Stock</p>
                          )}
                        </td>
                        <td className="py-3 pl-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditItem(it)}
                              className="p-2 rounded-lg text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                              title="Edit Item"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteItem(it.id)}
                              className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredItems.map((it) => {
                const isLow = it.stock <= it.lowStockAlert;
                return (
                  <div key={it.id} className="py-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{it.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {it.category} · {it.unit} · GST {it.gstPercent}%
                          {it.discountValue > 0
                            ? ` · Disc ${
                                it.discountType === 'percent'
                                  ? `${it.discountValue}%`
                                  : formatINR(it.discountValue)
                              }`
                            : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <p
                          className={`text-xs font-bold inline-flex items-center gap-1 ${
                            isLow ? 'text-amber-700' : 'text-slate-700'
                          }`}
                        >
                          {isLow && <AlertTriangle className="w-3.5 h-3.5" />}
                          Stock: {it.stock} {it.unit}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-4 text-xs tabular-nums">
                        <span>
                          Sale:{' '}
                          <strong className="text-emerald-700">
                            {formatINR(it.salePrice, true)}
                          </strong>
                        </span>
                        <span>
                          Buy: <strong className="text-slate-800">{formatINR(it.purchasePrice, true)}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditItem(it)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer min-h-[38px]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(it.id)}
                          className="p-2 rounded-xl border border-slate-200 text-rose-600 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                          aria-label="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl">
            <p className="text-sm font-semibold text-slate-700">No items found</p>
            <p className="text-xs text-slate-500 mt-1">
              Add your grocery, medical, dairy, or farming products to speed up billing.
            </p>
            <button
              type="button"
              onClick={onAddItem}
              className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer min-h-[42px]"
            >
              + Add First Item
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
