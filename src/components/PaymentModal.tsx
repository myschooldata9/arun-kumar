import React, {useEffect, useState} from 'react';
import {IndianRupee, X} from 'lucide-react';
import {Party, PaymentEntry} from '../types';
import {formatINR, getTodayISO} from '../utils/formatters';
import {generateId} from '../utils/storage';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  initialPartyId?: string;
  initialDirection?: 'received' | 'given';
  initialAmount?: number;
  getPartyBalance: (partyId: string) => number;
  onSave: (entry: PaymentEntry) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  parties,
  initialPartyId,
  initialDirection = 'received',
  initialAmount,
  getPartyBalance,
  onSave,
}) => {
  const [partyId, setPartyId] = useState(initialPartyId || parties[0]?.id || '');
  const [direction, setDirection] = useState<'received' | 'given'>(initialDirection);
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [date, setDate] = useState(getTodayISO());
  const [mode, setMode] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const defaultPartyId = initialPartyId || parties[0]?.id || '';
    setPartyId(defaultPartyId);
    const bal = defaultPartyId ? getPartyBalance(defaultPartyId) : 0;
    if (initialDirection) {
      setDirection(initialDirection);
    } else {
      setDirection(bal < 0 ? 'given' : 'received');
    }
    setAmount(initialAmount && initialAmount > 0 ? String(initialAmount) : '');
    setDate(getTodayISO());
    setMode('Cash');
    setNotes('');
    setError('');
  }, [isOpen, initialPartyId, initialDirection, initialAmount, parties, getPartyBalance]);

  if (!isOpen) return null;

  const selectedParty = parties.find((p) => p.id === partyId);
  const currentBalance = selectedParty ? getPartyBalance(selectedParty.id) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) {
      setError('Please select a party.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount greater than 0.');
      return;
    }

    onSave({
      id: generateId('pay'),
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      date,
      direction,
      amount: Math.round(parsedAmount * 100) / 100,
      mode,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Record Payment</h2>
            <p className="text-xs text-slate-500 mt-0.5">Settle Udhar Lena-Dena balance</p>
          </div>
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
          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setDirection('received')}
              className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[42px] ${
                direction === 'received'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payment Received (In)
            </button>
            <button
              type="button"
              onClick={() => setDirection('given')}
              className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[42px] ${
                direction === 'given'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payment Given (Out)
            </button>
          </div>

          {/* Party */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Party</label>
            <select
              value={partyId}
              onChange={(e) => {
                const nextId = e.target.value;
                setPartyId(nextId);
                const bal = getPartyBalance(nextId);
                setDirection(bal < 0 ? 'given' : 'received');
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            >
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.phone || 'No Phone'})
                </option>
              ))}
            </select>
            {selectedParty && (
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="text-slate-500">Current Balance:</span>
                <span
                  className={`font-semibold tabular-nums ${
                    currentBalance > 0
                      ? 'text-emerald-700'
                      : currentBalance < 0
                      ? 'text-rose-700'
                      : 'text-slate-600'
                  }`}
                >
                  {currentBalance > 0
                    ? `Lena Hai ${formatINR(currentBalance)}`
                    : currentBalance < 0
                    ? `Dena Hai ${formatINR(Math.abs(currentBalance))}`
                    : 'Settled (₹0)'}
                </span>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Amount (₹)</label>
              {currentBalance !== 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.abs(currentBalance)))}
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Use Full Balance ({formatINR(Math.abs(currentBalance))})
                </button>
              )}
            </div>
            <div className="relative">
              <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-base font-bold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[46px]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'Cash' | 'UPI' | 'Bank')}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / Online</option>
                <option value="Bank">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. GPay ref, cash collected at shop"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
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
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white cursor-pointer min-h-[46px] ${
                direction === 'received'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
