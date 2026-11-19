import React, {useEffect, useMemo, useState} from 'react';
import {Plus, Search, Trash2, UserPlus, X} from 'lucide-react';
import {
  Bill,
  BillItem,
  BillType,
  DiscountType,
  InventoryItem,
  Party,
  PaymentMode,
  UnitType,
} from '../types';
import {calculateBillLine, formatINR, getTodayISO, round2} from '../utils/formatters';
import {generateId, getNextBillNumber} from '../utils/storage';

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  parties: Party[];
  bills: Bill[];
  invoicePrefix: string;
  initialPartyId?: string;
  initialBillType?: BillType;
  onSaveBill: (bill: Bill) => void;
  onQuickAddParty: (party: Party) => void;
}

interface DraftLine {
  id: string;
  itemId?: string;
  name: string;
  unit: UnitType;
  qty: string;
  rate: string;
  purchaseRate: number;
  discountType: DiscountType;
  discountValue: string;
  gstPercent: number;
}

const UNITS: UnitType[] = ['Kg', 'Gram', 'Litre', 'Packet', 'Dozen', 'Piece', 'Box'];
const GST_OPTIONS = [0, 5, 12, 18, 28];

export const CreateBillModal: React.FC<CreateBillModalProps> = ({
  isOpen,
  onClose,
  items,
  parties,
  bills,
  invoicePrefix,
  initialPartyId,
  initialBillType = 'sale',
  onSaveBill,
  onQuickAddParty,
}) => {
  const [billType, setBillType] = useState<BillType>(initialBillType);
  const [partyId, setPartyId] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [paidInput, setPaidInput] = useState('');
  const [paidManuallyEdited, setPaidManuallyEdited] = useState(false);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const [showQuickParty, setShowQuickParty] = useState(false);
  const [quickPartyName, setQuickPartyName] = useState('');
  const [quickPartyPhone, setQuickPartyPhone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setBillType(initialBillType);
    const matchingParty =
      initialPartyId && parties.some((p) => p.id === initialPartyId)
        ? initialPartyId
        : parties.find((p) =>
            initialBillType === 'sale'
              ? p.type === 'customer' || p.type === 'both'
              : p.type === 'supplier' || p.type === 'both'
          )?.id ||
          parties[0]?.id ||
          '';
    setPartyId(matchingParty);
    setDate(getTodayISO());
    setPaymentMode('Cash');
    setPaidInput('');
    setPaidManuallyEdited(false);
    setNotes('');
    setLines([]);
    setItemSearch('');
    setShowCatalogPicker(false);
    setShowQuickParty(false);
    setQuickPartyName('');
    setQuickPartyPhone('');
    setError('');
  }, [isOpen, initialPartyId, initialBillType, parties]);

  const billNumber = useMemo(
    () => getNextBillNumber(invoicePrefix, billType, bills),
    [invoicePrefix, billType, bills]
  );

  const computedLines: BillItem[] = useMemo(() => {
    return lines.map((l) =>
      calculateBillLine({
        id: l.id,
        itemId: l.itemId,
        name: l.name,
        unit: l.unit,
        qty: parseFloat(l.qty) || 0,
        rate: parseFloat(l.rate) || 0,
        purchaseRate: l.purchaseRate,
        discountType: l.discountType,
        discountValue: parseFloat(l.discountValue) || 0,
        gstPercent: l.gstPercent,
      })
    );
  }, [lines]);

  const totals = useMemo(() => {
    const subtotal = round2(computedLines.reduce((acc, i) => acc + i.qty * i.rate, 0));
    const totalDiscount = round2(computedLines.reduce((acc, i) => acc + i.discountAmount, 0));
    const totalGst = round2(computedLines.reduce((acc, i) => acc + i.gstAmount, 0));
    const grandTotal = round2(computedLines.reduce((acc, i) => acc + i.total, 0));
    return {subtotal, totalDiscount, totalGst, grandTotal};
  }, [computedLines]);

  const effectivePaidAmount = useMemo(() => {
    if (paymentMode === 'Credit') {
      if (!paidManuallyEdited) return 0;
      return Math.min(totals.grandTotal, Math.max(0, round2(parseFloat(paidInput) || 0)));
    }
    if (!paidManuallyEdited) return totals.grandTotal;
    return Math.min(totals.grandTotal, Math.max(0, round2(parseFloat(paidInput) || 0)));
  }, [paymentMode, paidManuallyEdited, paidInput, totals.grandTotal]);

  const balanceDue = round2(Math.max(0, totals.grandTotal - effectivePaidAmount));

  const filteredCatalog = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items.filter(
      (it) => it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q)
    );
  }, [items, itemSearch]);

  if (!isOpen) return null;

  const handleBillTypeSwitch = (nextType: BillType) => {
    setBillType(nextType);
    // Update rates of catalog-linked lines to match Sale vs Purchase price
    setLines((prev) =>
      prev.map((l) => {
        if (!l.itemId) return l;
        const catalogItem = items.find((it) => it.id === l.itemId);
        if (!catalogItem) return l;
        return {
          ...l,
          rate: String(nextType === 'sale' ? catalogItem.salePrice : catalogItem.purchasePrice),
        };
      })
    );
    const matching = parties.find((p) =>
      nextType === 'sale'
        ? p.type === 'customer' || p.type === 'both'
        : p.type === 'supplier' || p.type === 'both'
    );
    if (matching) setPartyId(matching.id);
  };

  const addCatalogItem = (it: InventoryItem) => {
    setLines((prev) => [
      ...prev,
      {
        id: generateId('line'),
        itemId: it.id,
        name: it.name,
        unit: it.unit,
        qty: '1',
        rate: String(billType === 'sale' ? it.salePrice : it.purchasePrice),
        purchaseRate: it.purchasePrice,
        discountType: it.discountType,
        discountValue: String(it.discountValue),
        gstPercent: it.gstPercent,
      },
    ]);
    setItemSearch('');
    setShowCatalogPicker(false);
    setError('');
  };

  const addCustomLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: generateId('line'),
        name: itemSearch.trim() || 'Custom Item',
        unit: 'Piece',
        qty: '1',
        rate: '0',
        purchaseRate: 0,
        discountType: 'percent',
        discountValue: '0',
        gstPercent: 0,
      },
    ]);
    setItemSearch('');
    setShowCatalogPicker(false);
    setError('');
  };

  const updateLine = (id: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? {...l, ...patch} : l)));
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleQuickAddParty = () => {
    if (!quickPartyName.trim()) return;
    const newParty: Party = {
      id: generateId('party'),
      name: quickPartyName.trim(),
      phone: quickPartyPhone.trim(),
      type: billType === 'sale' ? 'customer' : 'supplier',
      address: '',
      gstin: '',
      openingBalance: 0,
      createdAt: new Date().toISOString(),
    };
    onQuickAddParty(newParty);
    setPartyId(newParty.id);
    setQuickPartyName('');
    setQuickPartyPhone('');
    setShowQuickParty(false);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const party = parties.find((p) => p.id === partyId);
    if (!party) {
      setError('Please select or add a party.');
      return;
    }
    if (computedLines.length === 0) {
      setError('Please add at least one item to the bill.');
      return;
    }
    if (computedLines.some((l) => !l.name.trim() || l.qty <= 0)) {
      setError('Every item must have a valid name and quantity greater than 0.');
      return;
    }

    onSaveBill({
      id: generateId('bill'),
      billNumber,
      type: billType,
      partyId: party.id,
      partyName: party.name,
      partyPhone: party.phone,
      date,
      paymentMode,
      items: computedLines,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      totalGst: totals.totalGst,
      grandTotal: totals.grandTotal,
      paidAmount: effectivePaidAmount,
      balanceDue,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs sm:p-4">
      <div className="w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Create New Bill</h2>
            <span className="font-mono text-xs font-semibold text-emerald-700">
              #{billNumber}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Close bill builder"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Bill Type Segmented Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleBillTypeSwitch('sale')}
              className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[42px] ${
                billType === 'sale'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sale Bill (Customer)
            </button>
            <button
              type="button"
              onClick={() => handleBillTypeSwitch('purchase')}
              className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[42px] ${
                billType === 'purchase'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Purchase Bill (Supplier)
            </button>
          </div>

          {/* Party, Date, Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {billType === 'sale' ? 'Customer / Party *' : 'Supplier / Party *'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickParty((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Quick Add Party</span>
                </button>
              </div>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
                required
              >
                <option value="" disabled>
                  Select Party
                </option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bill Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => {
                  const nextMode = e.target.value as PaymentMode;
                  setPaymentMode(nextMode);
                  setPaidManuallyEdited(false);
                  setPaidInput(nextMode === 'Credit' ? '0' : String(totals.grandTotal));
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              >
                <option value="Cash">Cash (Paid)</option>
                <option value="UPI">UPI / Online (Paid)</option>
                <option value="Credit">Credit / Udhar</option>
              </select>
            </div>
          </div>

          {/* Inline Quick Add Party */}
          {showQuickParty && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5">
              <p className="text-xs font-bold text-emerald-900">
                Quick Add {billType === 'sale' ? 'Customer' : 'Supplier'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={quickPartyName}
                  onChange={(e) => setQuickPartyName(e.target.value)}
                  placeholder="Party Name *"
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none min-h-[42px]"
                />
                <input
                  type="tel"
                  value={quickPartyPhone}
                  onChange={(e) => setQuickPartyPhone(e.target.value)}
                  placeholder="WhatsApp Phone"
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none min-h-[42px]"
                />
                <button
                  type="button"
                  onClick={handleQuickAddParty}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer min-h-[42px]"
                >
                  Save &amp; Select
                </button>
              </div>
            </div>
          )}

          {/* Add Item Search Bar */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Add Items to Bill</label>
              <button
                type="button"
                onClick={addCustomLine}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Item</span>
              </button>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={itemSearch}
                onFocus={() => setShowCatalogPicker(true)}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setShowCatalogPicker(true);
                }}
                placeholder="Search item from catalog (e.g. Wheat, Milk, Dolo, DAP)..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none min-h-[46px]"
              />
            </div>

            {showCatalogPicker && (
              <div className="mt-1.5 rounded-xl border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                {filteredCatalog.length > 0 ? (
                  filteredCatalog.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => addCatalogItem(it)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-emerald-50/70 transition-colors cursor-pointer min-h-[46px]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{it.name}</p>
                        <p className="text-xs text-slate-500">
                          {it.category} · {it.unit} · Stock: {it.stock}
                        </p>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <p className="text-sm font-bold text-emerald-700">
                          {formatINR(billType === 'sale' ? it.salePrice : it.purchasePrice, true)}
                        </p>
                        <p className="text-[11px] text-slate-500">GST {it.gstPercent}%</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center">
                    <p className="text-xs text-slate-500 mb-2">No matching catalog item.</p>
                    <button
                      type="button"
                      onClick={addCustomLine}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                    >
                      + Add &ldquo;{itemSearch}&rdquo; as Custom Item
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Item Lines List */}
          {lines.length > 0 ? (
            <div className="space-y-3">
              {lines.map((line, index) => {
                const calc = computedLines[index];
                return (
                  <div
                    key={line.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={line.name}
                        onChange={(e) => updateLine(line.id, {name: e.target.value})}
                        placeholder="Item name"
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[40px]"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.qty}
                          onChange={(e) => updateLine(line.id, {qty: e.target.value})}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[40px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Unit
                        </label>
                        <select
                          value={line.unit}
                          onChange={(e) => updateLine(line.id, {unit: e.target.value as UnitType})}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[40px]"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Rate (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.rate}
                          onChange={(e) => updateLine(line.id, {rate: e.target.value})}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[40px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Discount
                        </label>
                        <div className="flex rounded-lg border border-slate-300 bg-white overflow-hidden min-h-[40px]">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.discountValue}
                            onChange={(e) => updateLine(line.id, {discountValue: e.target.value})}
                            className="w-full px-2 py-1.5 text-sm tabular-nums text-slate-900 focus:outline-none"
                          />
                          <select
                            value={line.discountType}
                            onChange={(e) =>
                              updateLine(line.id, {discountType: e.target.value as DiscountType})
                            }
                            className="bg-slate-100 border-l border-slate-300 px-1.5 text-xs font-semibold text-slate-700"
                          >
                            <option value="percent">%</option>
                            <option value="flat">₹</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          GST %
                        </label>
                        <select
                          value={line.gstPercent}
                          onChange={(e) =>
                            updateLine(line.id, {gstPercent: Number(e.target.value)})
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[40px]"
                        >
                          {GST_OPTIONS.map((g) => (
                            <option key={g} value={g}>
                              {g}%
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/80 tabular-nums">
                      <span className="text-slate-500">
                        Disc: {formatINR(calc.discountAmount, true)} · GST:{' '}
                        {formatINR(calc.gstAmount, true)}
                      </span>
                      <span className="font-bold text-slate-900">
                        Line Total: {formatINR(calc.total, true)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
              Search and select items above, or click &ldquo;Add Custom Item&rdquo; to begin building this bill.
            </div>
          )}

          {/* Paid amount & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Amount Paid Now (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={totals.grandTotal}
                value={paidManuallyEdited ? paidInput : String(effectivePaidAmount)}
                onChange={(e) => {
                  setPaidManuallyEdited(true);
                  setPaidInput(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              />
              <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                {balanceDue > 0
                  ? `Remaining Udhar: ${formatINR(balanceDue, true)}`
                  : 'Full payment settled'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Bill Note (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Vehicle no, delivery note"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        </form>

        {/* Footer Totals & Submit */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="tabular-nums">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Sub: {formatINR(totals.subtotal, true)}</span>
              <span>·</span>
              <span>Disc: {formatINR(totals.totalDiscount, true)}</span>
              <span>·</span>
              <span>GST: {formatINR(totals.totalGst, true)}</span>
            </div>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              Grand Total: {formatINR(totals.grandTotal, true)}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer min-h-[46px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 sm:flex-initial rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer min-h-[46px]"
            >
              Save &amp; View Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
