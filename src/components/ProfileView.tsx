import React, {useEffect, useRef, useState} from 'react';
import {Download, RotateCcw, Save, Trash2, Upload} from 'lucide-react';
import {AppData, BusinessProfile} from '../types';
import {PWAInstallButton} from './PWAInstallButton';

interface ProfileViewProps {
  profile: BusinessProfile;
  appData: AppData;
  onSaveProfile: (profile: BusinessProfile) => void;
  onExportBackup: () => void;
  onImportBackup: (data: AppData) => void;
  onClearDemoData: () => void;
  onLoadDemoData: () => void;
  onToast: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onSaveProfile,
  onExportBackup,
  onImportBackup,
  onClearDemoData,
  onLoadDemoData,
  onToast,
}) => {
  const [form, setForm] = useState<BusinessProfile>(profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...form,
      businessName: form.businessName.trim() || 'My Business Store',
      gstin: form.gstin.trim().toUpperCase(),
      invoicePrefix: (form.invoicePrefix.trim() || 'GBB').toUpperCase(),
    });
    onToast('Business profile saved! Invoices will use these details.');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData;
        if (!parsed || !parsed.profile || !Array.isArray(parsed.bills)) {
          onToast('Invalid backup JSON file.');
          return;
        }
        onImportBackup(parsed);
        onToast('Backup restored successfully!');
      } catch {
        onToast('Could not read backup file. Ensure it is valid JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Business Profile &amp; Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Automatically appears at the top of every Tax Invoice, Khata Ledger, and P&amp;L PDF
        </p>
      </div>

      {/* Business Details Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Business / Shop Name *
            </label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => setForm({...form, businessName: e.target.value})}
              placeholder="e.g. Kisan Agro & Kirana Kendra"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Owner Name</label>
            <input
              type="text"
              value={form.ownerName}
              onChange={(e) => setForm({...form, ownerName: e.target.value})}
              placeholder="e.g. Maheshbhai Patel"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({...form, phone: e.target.value})}
              placeholder="10-digit shop phone"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email (Optional)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              placeholder="shop@example.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              GST Number (Optional)
            </label>
            <input
              type="text"
              value={form.gstin}
              onChange={(e) => setForm({...form, gstin: e.target.value})}
              placeholder="e.g. 24ABCPK1234F1Z8"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono uppercase text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              UPI ID for Payments (Optional)
            </label>
            <input
              type="text"
              value={form.upiId}
              onChange={(e) => setForm({...form, upiId: e.target.value})}
              placeholder="e.g. myshop@okicici"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-9">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full Business Address
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({...form, address: e.target.value})}
              placeholder="Shop No, Market, Street, City, Pin"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Invoice Prefix
            </label>
            <input
              type="text"
              value={form.invoicePrefix}
              onChange={(e) => setForm({...form, invoicePrefix: e.target.value})}
              placeholder="GBB"
              maxLength={8}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono uppercase text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Bill Terms &amp; Conditions
          </label>
          <textarea
            rows={2}
            value={form.terms}
            onChange={(e) => setForm({...form, terms: e.target.value})}
            placeholder="Goods once sold will not be taken back..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer min-h-[46px]"
          >
            <Save className="w-4 h-4" />
            <span>Save Business Profile</span>
          </button>
        </div>
      </form>

      {/* Offline Backup, Restore & Demo Data */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Offline Data Backup, Restore &amp; Demo Controls
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            All bills, items, and khata records are saved locally on your device. Export a JSON
            backup anytime to move data between phones or browsers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={onExportBackup}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer min-h-[44px]"
          >
            <Upload className="w-4 h-4" />
            <span>Restore JSON Backup</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileImport}
            className="hidden"
          />

          <button
            type="button"
            onClick={onLoadDemoData}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Load Sample Demo</span>
          </button>

          <button
            type="button"
            onClick={onClearDemoData}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer min-h-[44px]"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Demo Data</span>
          </button>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Install Green Bill Book on your Android phone or Desktop for offline home-screen access.
          </p>
          <PWAInstallButton variant="compact" />
        </div>
      </section>
    </div>
  );
};
