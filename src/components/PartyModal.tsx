import React, {useEffect, useState} from 'react';
import {X} from 'lucide-react';
import {Party, PartyType} from '../types';
import {generateId} from '../utils/storage';

interface PartyModalProps {
  isOpen: boolean;
  editingParty?: Party | null;
  defaultType?: PartyType;
  onClose: () => void;
  onSave: (party: Party) => void;
}

export const PartyModal: React.FC<PartyModalProps> = ({
  isOpen,
  editingParty,
  defaultType = 'customer',
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<PartyType>(defaultType);
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [openingDirection, setOpeningDirection] = useState<'lena' | 'dena'>('lena');
  const [openingAmount, setOpeningAmount] = useState('0');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingParty) {
      setName(editingParty.name);
      setPhone(editingParty.phone);
      setType(editingParty.type);
      setAddress(editingParty.address);
      setGstin(editingParty.gstin);
      setOpeningDirection(editingParty.openingBalance < 0 ? 'dena' : 'lena');
      setOpeningAmount(String(Math.abs(editingParty.openingBalance || 0)));
    } else {
      setName('');
      setPhone('');
      setType(defaultType);
      setAddress('');
      setGstin('');
      setOpeningDirection(defaultType === 'supplier' ? 'dena' : 'lena');
      setOpeningAmount('0');
    }
    setError('');
  }, [isOpen, editingParty, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Party name is required.');
      return;
    }
    const amt = Math.max(0, parseFloat(openingAmount) || 0);
    const signedOpening = openingDirection === 'dena' ? -amt : amt;

    onSave({
      id: editingParty ? editingParty.id : generateId('party'),
      name: name.trim(),
      phone: phone.trim(),
      type,
      address: address.trim(),
      gstin: gstin.trim().toUpperCase(),
      openingBalance: signedOpening,
      createdAt: editingParty ? editingParty.createdAt : new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            {editingParty ? 'Edit Party' : 'Add New Party'}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Party / Shop Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Patel Kirana, Mahalaxmi Agro"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number (WhatsApp)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Party Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PartyType)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              >
                <option value="customer">Customer (Sale Party)</option>
                <option value="supplier">Supplier (Purchase Party)</option>
                <option value="both">Both (Customer &amp; Supplier)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Address (Optional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop / Village / City"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              GSTIN (Optional)
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="e.g. 24AABCU9603R1ZM"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono uppercase text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Opening Udhar Balance
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setOpeningDirection('lena')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer min-h-[40px] ${
                  openingDirection === 'lena'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                Lena Hai (To Collect)
              </button>
              <button
                type="button"
                onClick={() => setOpeningDirection('dena')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer min-h-[40px] ${
                  openingDirection === 'dena'
                    ? 'border-rose-600 bg-rose-50 text-rose-800'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                Dena Hai (To Pay)
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
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
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer min-h-[46px]"
            >
              {editingParty ? 'Save Party' : 'Add Party'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
