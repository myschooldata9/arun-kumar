import React, {useCallback, useEffect, useState} from 'react';
import {
  BookOpen,
  LayoutDashboard,
  Package,
  Plus,
  Store,
  Users,
} from 'lucide-react';
import {ConfirmModal} from './components/ConfirmModal';
import {CreateBillModal} from './components/CreateBillModal';
import {DashboardView} from './components/DashboardView';
import {InvoiceModal} from './components/InvoiceModal';
import {ItemModal} from './components/ItemModal';
import {ItemsView} from './components/ItemsView';
import {OfflineIndicator} from './components/OfflineIndicator';
import {PartyModal} from './components/PartyModal';
import {PartyView} from './components/PartyView';
import {PaymentModal} from './components/PaymentModal';
import {ProfileView} from './components/ProfileView';
import {PWAInstallButton} from './components/PWAInstallButton';
import {createEmptyData, createSeedData} from './data/seedData';
import {
  AppData,
  Bill,
  BillType,
  BusinessProfile,
  InventoryItem,
  MainTab,
  Party,
  PartyType,
  PaymentEntry,
} from './types';
import {computePartyNetBalance, getTodayISO} from './utils/formatters';
import {loadAppData, saveAppData} from './utils/storage';

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  // Modals State
  const [createBillOpen, setCreateBillOpen] = useState(false);
  const [billPresetPartyId, setBillPresetPartyId] = useState<string | undefined>(undefined);
  const [billPresetType, setBillPresetType] = useState<BillType>('sale');

  const [viewingBill, setViewingBill] = useState<Bill | null>(null);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [defaultPartyType, setDefaultPartyType] = useState<PartyType>('customer');

  const [paymentModalState, setPaymentModalState] = useState<{
    open: boolean;
    partyId?: string;
    direction: 'received' | 'given';
    amount?: number;
  }>({open: false, direction: 'received'});

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const getPartyBalance = useCallback(
    (partyId: string) => {
      const party = data.parties.find((p) => p.id === partyId);
      if (!party) return 0;
      return computePartyNetBalance(party, data.bills, data.payments);
    },
    [data.parties, data.bills, data.payments]
  );

  // Bill handlers
  const handleSaveBill = (newBill: Bill) => {
    setData((prev) => {
      const updatedItems = prev.items.map((item) => {
        const usedQty = newBill.items
          .filter((li) => li.itemId === item.id)
          .reduce((s, li) => s + li.qty, 0);
        if (usedQty <= 0) return item;
        const nextStock =
          newBill.type === 'sale'
            ? Math.max(0, Math.round((item.stock - usedQty) * 100) / 100)
            : Math.round((item.stock + usedQty) * 100) / 100;
        return {...item, stock: nextStock};
      });

      return {
        ...prev,
        items: updatedItems,
        bills: [newBill, ...prev.bills],
      };
    });

    setViewingBill(newBill);
    showToast(`Saved ${newBill.type === 'sale' ? 'Sale' : 'Purchase'} Bill #${newBill.billNumber}`);
  };

  const handleDeleteBill = (billId: string) => {
    const target = data.bills.find((b) => b.id === billId);
    if (!target) return;
    setConfirmState({
      open: true,
      title: `Delete Bill #${target.billNumber}?`,
      message:
        'This will remove the bill from your history, adjust inventory stock back, and update the party Udhar balance.',
      confirmLabel: 'Delete Bill',
      destructive: true,
      onConfirm: () => {
        setData((prev) => {
          const updatedItems = prev.items.map((item) => {
            const usedQty = target.items
              .filter((li) => li.itemId === item.id)
              .reduce((s, li) => s + li.qty, 0);
            if (usedQty <= 0) return item;
            const restoredStock =
              target.type === 'sale'
                ? Math.round((item.stock + usedQty) * 100) / 100
                : Math.max(0, Math.round((item.stock - usedQty) * 100) / 100);
            return {...item, stock: restoredStock};
          });
          return {
            ...prev,
            items: updatedItems,
            bills: prev.bills.filter((b) => b.id !== billId),
          };
        });
        setConfirmState(null);
        showToast(`Deleted bill #${target.billNumber}`);
      },
    });
  };

  // Item handlers
  const handleSaveItem = (item: InventoryItem) => {
    setData((prev) => {
      const exists = prev.items.some((i) => i.id === item.id);
      return {
        ...prev,
        items: exists
          ? prev.items.map((i) => (i.id === item.id ? item : i))
          : [item, ...prev.items],
      };
    });
    showToast(`Saved item "${item.name}"`);
  };

  const handleDeleteItem = (itemId: string) => {
    const target = data.items.find((i) => i.id === itemId);
    if (!target) return;
    setConfirmState({
      open: true,
      title: `Delete "${target.name}"?`,
      message: 'Removing this item from the catalog will not affect past saved bills.',
      confirmLabel: 'Delete Item',
      destructive: true,
      onConfirm: () => {
        setData((prev) => ({
          ...prev,
          items: prev.items.filter((i) => i.id !== itemId),
        }));
        setConfirmState(null);
        showToast(`Removed "${target.name}"`);
      },
    });
  };

  // Party handlers
  const handleSaveParty = (party: Party) => {
    setData((prev) => {
      const exists = prev.parties.some((p) => p.id === party.id);
      return {
        ...prev,
        parties: exists
          ? prev.parties.map((p) => (p.id === party.id ? party : p))
          : [party, ...prev.parties],
      };
    });
    showToast(`Saved party "${party.name}"`);
  };

  const handleDeleteParty = (partyId: string) => {
    const target = data.parties.find((p) => p.id === partyId);
    if (!target) return;
    setConfirmState({
      open: true,
      title: `Delete "${target.name}"?`,
      message: 'This removes the party from your directory. Existing bills remain in bill history.',
      confirmLabel: 'Delete Party',
      destructive: true,
      onConfirm: () => {
        setData((prev) => ({
          ...prev,
          parties: prev.parties.filter((p) => p.id !== partyId),
        }));
        if (selectedPartyId === partyId) setSelectedPartyId(null);
        setConfirmState(null);
        showToast(`Deleted party "${target.name}"`);
      },
    });
  };

  // Payment handler
  const handleSavePayment = (entry: PaymentEntry) => {
    setData((prev) => ({
      ...prev,
      payments: [entry, ...prev.payments],
    }));
    showToast(
      `Recorded ${entry.direction === 'received' ? 'Payment Received' : 'Payment Given'} for ${
        entry.partyName
      }`
    );
  };

  // Profile & Backup handlers
  const handleSaveProfile = (profile: BusinessProfile) => {
    setData((prev) => ({...prev, profile}));
  };

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `green-bill-book-backup-${getTodayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported JSON backup file');
  };

  const handleClearDemoData = () => {
    setConfirmState({
      open: true,
      title: 'Clear all demo & current data?',
      message:
        'This will clear all items, parties, bills, and payments so you can start fresh with your own business records. Your business profile name and settings will be preserved.',
      confirmLabel: 'Clear Data',
      destructive: true,
      onConfirm: () => {
        const empty = createEmptyData();
        setData((prev) => ({
          ...empty,
          profile: prev.profile,
        }));
        setSelectedPartyId(null);
        setConfirmState(null);
        showToast('Demo data cleared. Ready for your business entries!');
      },
    });
  };

  const handleLoadDemoData = () => {
    setConfirmState({
      open: true,
      title: 'Load sample Indian business demo data?',
      message:
        'This replaces current records with sample Kirana, Agro, Dairy, and Medical bills across multiple months so you can test Date Filters, P&L reports, and Khata ledgers.',
      confirmLabel: 'Load Demo Data',
      onConfirm: () => {
        setData(createSeedData());
        setSelectedPartyId(null);
        setConfirmState(null);
        showToast('Loaded realistic sample demo data');
      },
    });
  };

  const openNewBill = (partyId?: string, type: BillType = 'sale') => {
    setBillPresetPartyId(partyId);
    setBillPresetType(type);
    setCreateBillOpen(true);
  };

  const navItems: Array<{id: MainTab; label: string; icon: React.ComponentType<{className?: string}>}> =
    [
      {id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard},
      {id: 'items', label: 'Items', icon: Package},
      {id: 'party', label: 'Party', icon: Users},
      {id: 'profile', label: 'Profile', icon: Store},
    ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white z-30">
        <div className="px-5 py-5 border-b border-slate-200 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">Green Bill Book</h1>
            <p className="text-xs text-slate-500 truncate">{data.profile.businessName}</p>
          </div>
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={() => openNewBill()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer min-h-[48px] shadow-xs"
          >
            <Plus className="w-5 h-5" />
            <span>New Bill</span>
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((nav) => {
            const Icon = nav.icon;
            const active = activeTab === nav.id;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => {
                  setActiveTab(nav.id);
                  if (nav.id !== 'party') setSelectedPartyId(null);
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors cursor-pointer min-h-[44px] ${
                  active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{nav.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <PWAInstallButton variant="sidebar" />
          <p className="text-[11px] text-slate-400 text-center">
            Offline-ready local accounting
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Mobile Compact Sticky Top Header */}
        <header className="no-print lg:hidden sticky top-0 z-30 h-13 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-900 truncate">Green Bill Book</span>
          </div>
          <PWAInstallButton variant="compact" />
        </header>

        {/* Desktop Top Context Bar */}
        <header className="no-print hidden lg:flex items-center justify-between gap-6 px-8 py-4 border-b border-slate-200 bg-white sticky top-0 z-20">
          <div>
            <h2 className="text-lg font-bold text-slate-900 capitalize">
              {activeTab === 'party' && selectedPartyId ? 'Party Khata Ledger' : activeTab}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setPaymentModalState({
                  open: true,
                  direction: 'received',
                })
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer min-h-[40px] whitespace-nowrap"
            >
              Record Payment
            </button>
            <button
              type="button"
              onClick={() => openNewBill()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer min-h-[40px] whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Create Bill</span>
            </button>
          </div>
        </header>

        {/* Viewport Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10">
          {activeTab === 'dashboard' && (
            <DashboardView
              profile={data.profile}
              items={data.items}
              parties={data.parties}
              bills={data.bills}
              payments={data.payments}
              onOpenNewBill={() => openNewBill()}
              onViewBill={(b) => setViewingBill(b)}
              onDeleteBill={handleDeleteBill}
              onRecordPayment={(partyId, direction, amount) =>
                setPaymentModalState({open: true, partyId, direction, amount})
              }
              onOpenPartyLedger={(partyId) => {
                setSelectedPartyId(partyId);
                setActiveTab('party');
              }}
              onToast={showToast}
            />
          )}

          {activeTab === 'items' && (
            <ItemsView
              items={data.items}
              onAddItem={() => {
                setEditingItem(null);
                setItemModalOpen(true);
              }}
              onEditItem={(it) => {
                setEditingItem(it);
                setItemModalOpen(true);
              }}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {activeTab === 'party' && (
            <PartyView
              profile={data.profile}
              parties={data.parties}
              bills={data.bills}
              payments={data.payments}
              selectedPartyId={selectedPartyId}
              onSelectParty={setSelectedPartyId}
              onAddParty={(defaultType = 'customer') => {
                setEditingParty(null);
                setDefaultPartyType(defaultType);
                setPartyModalOpen(true);
              }}
              onEditParty={(p) => {
                setEditingParty(p);
                setPartyModalOpen(true);
              }}
              onDeleteParty={handleDeleteParty}
              onCreateBillForParty={(partyId, billType) => openNewBill(partyId, billType)}
              onRecordPayment={(partyId, direction, amount) =>
                setPaymentModalState({open: true, partyId, direction, amount})
              }
              onViewBill={(b) => setViewingBill(b)}
              onToast={showToast}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              profile={data.profile}
              appData={data}
              onSaveProfile={handleSaveProfile}
              onExportBackup={handleExportBackup}
              onImportBackup={(restored) => setData(restored)}
              onClearDemoData={handleClearDemoData}
              onLoadDemoData={handleLoadDemoData}
              onToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar with Centered Floating "+" Action Button */}
      <nav
        aria-label="Primary Mobile Navigation"
        className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {navItems.slice(0, 2).map((nav) => {
            const Icon = nav.icon;
            const active = activeTab === nav.id;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => {
                  setActiveTab(nav.id);
                  setSelectedPartyId(null);
                }}
                className={`flex flex-col items-center justify-center min-h-[48px] cursor-pointer ${
                  active ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold mt-1">{nav.label}</span>
              </button>
            );
          })}

          {/* Centered Floating "+" Button */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => openNewBill()}
              aria-label="Create New Bill"
              className="-mt-6 flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {navItems.slice(2).map((nav) => {
            const Icon = nav.icon;
            const active = activeTab === nav.id;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => {
                  setActiveTab(nav.id);
                  if (nav.id !== 'party') setSelectedPartyId(null);
                }}
                className={`flex flex-col items-center justify-center min-h-[48px] cursor-pointer ${
                  active ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold mt-1">{nav.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <CreateBillModal
        isOpen={createBillOpen}
        onClose={() => setCreateBillOpen(false)}
        items={data.items}
        parties={data.parties}
        bills={data.bills}
        invoicePrefix={data.profile.invoicePrefix}
        initialPartyId={billPresetPartyId}
        initialBillType={billPresetType}
        onSaveBill={handleSaveBill}
        onQuickAddParty={(newParty) =>
          setData((prev) => ({...prev, parties: [newParty, ...prev.parties]}))
        }
      />

      <InvoiceModal
        bill={viewingBill}
        profile={data.profile}
        party={
          viewingBill ? data.parties.find((p) => p.id === viewingBill.partyId) : undefined
        }
        onClose={() => setViewingBill(null)}
        onRecordPayment={(b) => {
          setViewingBill(null);
          setPaymentModalState({
            open: true,
            partyId: b.partyId,
            direction: b.type === 'sale' ? 'received' : 'given',
            amount: b.balanceDue,
          });
        }}
        onToast={showToast}
      />

      <ItemModal
        isOpen={itemModalOpen}
        editingItem={editingItem}
        onClose={() => setItemModalOpen(false)}
        onSave={handleSaveItem}
      />

      <PartyModal
        isOpen={partyModalOpen}
        editingParty={editingParty}
        defaultType={defaultPartyType}
        onClose={() => setPartyModalOpen(false)}
        onSave={handleSaveParty}
      />

      <PaymentModal
        isOpen={paymentModalState.open}
        onClose={() => setPaymentModalState((s) => ({...s, open: false}))}
        parties={data.parties}
        initialPartyId={paymentModalState.partyId}
        initialDirection={paymentModalState.direction}
        initialAmount={paymentModalState.amount}
        getPartyBalance={getPartyBalance}
        onSave={handleSavePayment}
      />

      {confirmState && (
        <ConfirmModal
          isOpen={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          destructive={confirmState.destructive}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="no-print fixed top-16 lg:top-6 right-4 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-lg max-w-xs"
        >
          {toast}
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
