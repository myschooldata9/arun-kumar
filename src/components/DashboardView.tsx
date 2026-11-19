import React, {useMemo, useState} from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Download,
  Eye,
  IndianRupee,
  MessageCircle,
  Search,
  Share2,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {Bill, BusinessProfile, InventoryItem, Party, PaymentEntry} from '../types';
import {
  computePartyNetBalance,
  formatDisplayDate,
  formatINR,
  formatMonthLabel,
  getMonthBounds,
  getTodayISO,
  getWeekStartISO,
  round2,
} from '../utils/formatters';
import {
  createMonthlyPLPDF,
  openWhatsAppReminder,
  sharePDFOnWhatsApp,
} from '../utils/pdfGenerator';
import {AnalyticsChart} from './AnalyticsChart';

interface DashboardViewProps {
  profile: BusinessProfile;
  items: InventoryItem[];
  parties: Party[];
  bills: Bill[];
  payments: PaymentEntry[];
  onOpenNewBill: () => void;
  onViewBill: (bill: Bill) => void;
  onDeleteBill: (billId: string) => void;
  onRecordPayment: (partyId: string, direction: 'received' | 'given', amount: number) => void;
  onOpenPartyLedger: (partyId: string) => void;
  onToast: (msg: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  items,
  parties,
  bills,
  payments,
  onOpenNewBill,
  onViewBill,
  onDeleteBill,
  onRecordPayment,
  onOpenPartyLedger,
  onToast,
}) => {
  const todayISO = getTodayISO();
  const currentMonthKey = todayISO.slice(0, 7);

  // Month-Wise P&L Selector
  const availableMonths = useMemo(() => {
    const set = new Set<string>([currentMonthKey]);
    for (const b of bills) {
      if (b.date) set.add(b.date.slice(0, 7));
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [bills, currentMonthKey]);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  // Bill History Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [billTypeFilter, setBillTypeFilter] = useState<'all' | 'sale' | 'purchase'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activePreset, setActivePreset] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // 4 Key Summary Cards
  const summary = useMemo(() => {
    let todaySale = 0;
    let todayPurchase = 0;
    for (const b of bills) {
      if (b.date !== todayISO) continue;
      if (b.type === 'sale') todaySale += b.grandTotal;
      else todayPurchase += b.grandTotal;
    }

    let totalReceivable = 0;
    let totalPayable = 0;
    const partyBalances: Array<{party: Party; balance: number}> = [];

    for (const p of parties) {
      const bal = computePartyNetBalance(p, bills, payments);
      if (bal > 0) totalReceivable += bal;
      else if (bal < 0) totalPayable += Math.abs(bal);
      if (bal !== 0) {
        partyBalances.push({party: p, balance: bal});
      }
    }

    partyBalances.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    return {
      todaySale: round2(todaySale),
      todayPurchase: round2(todayPurchase),
      totalReceivable: round2(totalReceivable),
      totalPayable: round2(totalPayable),
      topPendingParties: partyBalances.slice(0, 6),
    };
  }, [bills, parties, payments, todayISO]);

  // Month-Wise P&L Calculations
  const plReport = useMemo(() => {
    const monthSales = bills.filter(
      (b) => b.type === 'sale' && b.date.startsWith(selectedMonth)
    );
    const monthPurchases = bills.filter(
      (b) => b.type === 'purchase' && b.date.startsWith(selectedMonth)
    );

    const salesRevenue = round2(monthSales.reduce((s, b) => s + b.grandTotal, 0));
    const gstCollected = round2(monthSales.reduce((s, b) => s + b.totalGst, 0));
    const taxableSales = round2(salesRevenue - gstCollected);
    const totalPurchases = round2(monthPurchases.reduce((s, b) => s + b.grandTotal, 0));

    let cogs = 0;
    const itemMap = new Map<
      string,
      {name: string; qtySold: number; unit: string; revenue: number; profit: number}
    >();
    const catalogMap = new Map(items.map((it) => [it.id, it]));

    for (const b of monthSales) {
      for (const line of b.items) {
        const unitCost =
          line.purchaseRate > 0
            ? line.purchaseRate
            : line.itemId
            ? catalogMap.get(line.itemId)?.purchasePrice || 0
            : 0;
        const lineCogs = round2(unitCost * line.qty);
        cogs += lineCogs;

        const key = line.itemId || line.name;
        const existing = itemMap.get(key) || {
          name: line.name,
          qtySold: 0,
          unit: line.unit,
          revenue: 0,
          profit: 0,
        };
        existing.qtySold = round2(existing.qtySold + line.qty);
        existing.revenue = round2(existing.revenue + line.taxableAmount);
        existing.profit = round2(existing.profit + (line.taxableAmount - lineCogs));
        itemMap.set(key, existing);
      }
    }

    cogs = round2(cogs);
    const netProfit = round2(taxableSales - cogs);
    const profitMarginPct = taxableSales > 0 ? (netProfit / taxableSales) * 100 : 0;

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 6);

    return {
      salesRevenue,
      taxableSales,
      gstCollected,
      cogs,
      totalPurchases,
      netProfit,
      profitMarginPct,
      saleCount: monthSales.length,
      purchaseCount: monthPurchases.length,
      topItems,
    };
  }, [bills, items, selectedMonth]);

  // Filtered Bills
  const filteredBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bills
      .filter((b) => {
        if (billTypeFilter !== 'all' && b.type !== billTypeFilter) return false;
        if (fromDate && b.date < fromDate) return false;
        if (toDate && b.date > toDate) return false;
        if (q) {
          const hit =
            b.billNumber.toLowerCase().includes(q) ||
            b.partyName.toLowerCase().includes(q) ||
            b.partyPhone.toLowerCase().includes(q) ||
            b.items.some((i) => i.name.toLowerCase().includes(q));
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [bills, billTypeFilter, fromDate, toDate, searchQuery]);

  const filteredTotals = useMemo(() => {
    let sales = 0;
    let purchases = 0;
    for (const b of filteredBills) {
      if (b.type === 'sale') sales += b.grandTotal;
      else purchases += b.grandTotal;
    }
    return {
      sales: round2(sales),
      purchases: round2(purchases),
      combined: round2(sales + purchases),
    };
  }, [filteredBills]);

  const applyPreset = (preset: 'all' | 'today' | 'week' | 'month') => {
    setActivePreset(preset);
    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'today') {
      setFromDate(todayISO);
      setToDate(todayISO);
    } else if (preset === 'week') {
      setFromDate(getWeekStartISO());
      setToDate(todayISO);
    } else if (preset === 'month') {
      const now = new Date();
      const {from, to} = getMonthBounds(now.getFullYear(), now.getMonth());
      setFromDate(from);
      setToDate(to);
    }
  };

  const handleDownloadPL = () => {
    const doc = createMonthlyPLPDF({
      monthKey: selectedMonth,
      profile,
      ...plReport,
    });
    doc.save(`Profit-Loss-${selectedMonth}.pdf`);
    onToast(`Downloaded P&L Report for ${formatMonthLabel(selectedMonth)}`);
  };

  const handleSharePL = async () => {
    const doc = createMonthlyPLPDF({
      monthKey: selectedMonth,
      profile,
      ...plReport,
    });
    const summaryText = [
      `*${profile.businessName}* — Monthly P&L (${formatMonthLabel(selectedMonth)})`,
      `Sales Revenue: ${formatINR(plReport.salesRevenue)}`,
      `COGS: ${formatINR(plReport.cogs)}`,
      `${plReport.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}: *${formatINR(
        Math.abs(plReport.netProfit)
      )}* (${plReport.profitMarginPct.toFixed(1)}%)`,
      '_Generated by GREEN BILL BOOK_',
    ].join('\n');

    const res = await sharePDFOnWhatsApp({
      doc,
      filename: `Profit-Loss-${selectedMonth}.pdf`,
      summaryText,
      title: `Monthly P&L - ${formatMonthLabel(selectedMonth)}`,
    });
    if (res === 'downloaded_and_wa') {
      onToast('P&L PDF downloaded! Attach it in the opened WhatsApp window.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Key Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Today&apos;s Sale</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold tabular-nums text-slate-900">
            {formatINR(summary.todaySale)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">{formatDisplayDate(todayISO)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Today&apos;s Purchase</span>
            <ArrowDownLeft className="w-4 h-4 text-slate-700" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold tabular-nums text-slate-900">
            {formatINR(summary.todayPurchase)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">{formatDisplayDate(todayISO)}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Total Receivable</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold tabular-nums text-emerald-700">
            {formatINR(summary.totalReceivable)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-emerald-800">Money Lena Hai</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">Total Payable</span>
            <TrendingDown className="w-4 h-4 text-rose-700" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold tabular-nums text-rose-700">
            {formatINR(summary.totalPayable)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-rose-800">Money Dena Hai</p>
        </div>
      </div>

      {/* Analytics Chart + Top Pending Udhar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7">
          <AnalyticsChart bills={bills} payments={payments} />
        </div>

        <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Top Pending Udhar</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quick payment settlement &amp; reminders
              </p>
            </div>
          </div>

          {summary.topPendingParties.length > 0 ? (
            <div className="divide-y divide-slate-100 flex-1">
              {summary.topPendingParties.map(({party, balance}) => {
                const isReceivable = balance > 0;
                return (
                  <div
                    key={party.id}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenPartyLedger(party.id)}
                      className="min-w-0 text-left hover:underline cursor-pointer"
                    >
                      <p className="text-sm font-semibold text-slate-900 truncate">{party.name}</p>
                      <p
                        className={`text-xs font-semibold tabular-nums ${
                          isReceivable ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isReceivable ? 'Lena Hai' : 'Dena Hai'} {formatINR(Math.abs(balance))}
                      </p>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isReceivable && party.phone && (
                        <button
                          type="button"
                          onClick={() =>
                            openWhatsAppReminder({
                              partyName: party.name,
                              phone: party.phone,
                              amount: balance,
                              businessName: profile.businessName,
                              upiId: profile.upiId,
                            })
                          }
                          title="Send WhatsApp Udhar Reminder"
                          className="p-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                          aria-label={`WhatsApp reminder to ${party.name}`}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onRecordPayment(
                            party.id,
                            isReceivable ? 'received' : 'given',
                            Math.abs(balance)
                          )
                        }
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer min-h-[40px] whitespace-nowrap"
                      >
                        Settle
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm font-medium text-slate-600">All Udhar accounts are settled</p>
              <p className="text-xs text-slate-400 mt-1">
                Credit bills will appear here automatically.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Month-Wise Profit & Loss (P&L) Report Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Month-Wise Profit &amp; Loss (P&amp;L) Report
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated from item sale prices, GST, and purchase cost (COGS)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Select P&L Month and Year"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[42px]"
            >
              {availableMonths.map((mKey) => (
                <option key={mKey} value={mKey}>
                  {formatMonthLabel(mKey)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleDownloadPL}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer min-h-[42px]"
            >
              <Download className="w-4 h-4" />
              <span>P&amp;L PDF</span>
            </button>
            <button
              type="button"
              onClick={handleSharePL}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer min-h-[42px]"
            >
              <Share2 className="w-4 h-4" />
              <span>Share P&amp;L</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
            <p className="text-xs font-medium text-slate-500">Monthly Sales Revenue</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
              {formatINR(plReport.salesRevenue)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              {plReport.saleCount} bills · Excl. GST {formatINR(plReport.taxableSales)}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
            <p className="text-xs font-medium text-slate-500">Cost of Goods Sold (COGS)</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
              {formatINR(plReport.cogs)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              Item purchase cost basis
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
            <p className="text-xs font-medium text-slate-500">Monthly Purchase Bills</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
              {formatINR(plReport.totalPurchases)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              {plReport.purchaseCount} stock restock bills
            </p>
          </div>

          <div
            className={`rounded-xl border p-3.5 ${
              plReport.netProfit >= 0
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-rose-50 border-rose-200'
            }`}
          >
            <p
              className={`text-xs font-bold ${
                plReport.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              {plReport.netProfit >= 0 ? 'Gross / Net Profit' : 'Net Loss'}
            </p>
            <p
              className={`mt-1 text-lg font-bold tabular-nums ${
                plReport.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatINR(Math.abs(plReport.netProfit))}
            </p>
            <p
              className={`text-[11px] font-semibold mt-0.5 tabular-nums ${
                plReport.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              Margin: {plReport.profitMarginPct.toFixed(1)}%
            </p>
          </div>
        </div>
      </section>

      {/* All Bills & Date Range Filter */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">All Bills &amp; Transactions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Search or filter by From Date – To Date and bill type
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
            {(
              [
                ['all', 'All Time'],
                ['today', 'Today'],
                ['week', 'This Week'],
                ['month', 'This Month'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[36px] whitespace-nowrap ${
                  activePreset === key
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bill #, party, or item..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <input
              type="date"
              value={fromDate}
              aria-label="From Date"
              onChange={(e) => {
                setFromDate(e.target.value);
                setActivePreset('all');
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <span className="text-xs text-slate-400 shrink-0">to</span>
            <input
              type="date"
              value={toDate}
              aria-label="To Date"
              onChange={(e) => {
                setToDate(e.target.value);
                setActivePreset('all');
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="sm:col-span-2">
            <select
              value={billTypeFilter}
              aria-label="Filter by Bill Type"
              onChange={(e) =>
                setBillTypeFilter(e.target.value as 'all' | 'sale' | 'purchase')
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            >
              <option value="all">All Bills</option>
              <option value="sale">Sale Bills</option>
              <option value="purchase">Purchase Bills</option>
            </select>
          </div>
        </div>

        {/* Filtered Totals Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 px-4 py-2.5 text-xs">
          <span className="font-semibold text-slate-700">
            Showing {filteredBills.length} matching {filteredBills.length === 1 ? 'bill' : 'bills'}
          </span>
          <div className="flex flex-wrap items-center gap-4 tabular-nums font-bold">
            <span className="text-emerald-800">Sale: {formatINR(filteredTotals.sales)}</span>
            <span className="text-slate-700">Purchase: {formatINR(filteredTotals.purchases)}</span>
          </div>
        </div>

        {/* Bills List */}
        {filteredBills.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500">
                    <th className="py-2.5 pr-3">Bill #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Party</th>
                    <th className="py-2.5 px-3">Type · Mode</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Udhar Due</th>
                    <th className="py-2.5 pl-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredBills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pr-3 font-mono font-semibold text-slate-900">
                        <button
                          type="button"
                          onClick={() => onViewBill(b)}
                          className="hover:text-emerald-700 hover:underline cursor-pointer"
                        >
                          {b.billNumber}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDisplayDate(b.date)}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        <button
                          type="button"
                          onClick={() => onOpenPartyLedger(b.partyId)}
                          className="hover:text-emerald-700 hover:underline cursor-pointer text-left"
                        >
                          {b.partyName}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            b.type === 'sale' ? 'text-emerald-700' : 'text-slate-700'
                          }`}
                        >
                          {b.type === 'sale' ? 'Sale' : 'Purchase'}
                        </span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span>{b.paymentMode}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums text-slate-900 whitespace-nowrap">
                        {formatINR(b.grandTotal)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                        {b.balanceDue > 0 ? (
                          <span className="text-xs font-bold text-rose-700">
                            {formatINR(b.balanceDue)}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-700">Paid</span>
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onViewBill(b)}
                            className="p-2 rounded-lg text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                            title="View, Print & WhatsApp PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {b.balanceDue > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                onRecordPayment(
                                  b.partyId,
                                  b.type === 'sale' ? 'received' : 'given',
                                  b.balanceDue
                                )
                              }
                              className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                              title="Record Payment"
                            >
                              <IndianRupee className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteBill(b.id)}
                            className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                            title="Delete Bill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredBills.map((b) => (
                <div key={b.id} className="py-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{b.partyName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-mono font-semibold text-slate-700">
                          #{b.billNumber}
                        </span>
                        <span className="mx-1.5">·</span>
                        <span>{formatDisplayDate(b.date)}</span>
                        <span className="mx-1.5">·</span>
                        <span
                          className={
                            b.type === 'sale' ? 'text-emerald-700 font-semibold' : 'font-semibold'
                          }
                        >
                          {b.type === 'sale' ? 'Sale' : 'Purchase'}
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <p className="text-sm font-bold text-slate-900">{formatINR(b.grandTotal)}</p>
                      <p
                        className={`text-[11px] font-semibold ${
                          b.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {b.balanceDue > 0 ? `Due ${formatINR(b.balanceDue)}` : `Paid (${b.paymentMode})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onViewBill(b)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer min-h-[40px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Invoice / WhatsApp PDF</span>
                    </button>
                    {b.balanceDue > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onRecordPayment(
                            b.partyId,
                            b.type === 'sale' ? 'received' : 'given',
                            b.balanceDue
                          )
                        }
                        className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 cursor-pointer min-h-[40px]"
                      >
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>Settle</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteBill(b.id)}
                      className="p-2 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                      aria-label="Delete bill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl">
            <p className="text-sm font-semibold text-slate-700">No bills match your filter</p>
            <p className="text-xs text-slate-500 mt-1">
              Try clearing the date filter or create your first Sale / Purchase bill.
            </p>
            <button
              type="button"
              onClick={onOpenNewBill}
              className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer min-h-[42px]"
            >
              + Create New Bill
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
