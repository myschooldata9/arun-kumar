import React, {useMemo, useState} from 'react';
import {Bill, PaymentEntry} from '../types';
import {formatINR, formatMonthLabel} from '../utils/formatters';

interface AnalyticsChartProps {
  bills: Bill[];
  payments: PaymentEntry[];
}

type ChartMode = 'sales_purchase' | 'cash_flow';

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({bills, payments}) => {
  const [mode, setMode] = useState<ChartMode>('sales_purchase');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const monthsData = useMemo(() => {
    const now = new Date();
    const months: Array<{
      key: string;
      label: string;
      sales: number;
      purchases: number;
      cashIn: number;
      cashOut: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        key,
        label: formatMonthLabel(key),
        sales: 0,
        purchases: 0,
        cashIn: 0,
        cashOut: 0,
      });
    }

    const map = new Map(months.map((m) => [m.key, m]));

    for (const b of bills) {
      const mKey = b.date.slice(0, 7);
      const bucket = map.get(mKey);
      if (!bucket) continue;
      if (b.type === 'sale') {
        bucket.sales += b.grandTotal;
        bucket.cashIn += b.paidAmount;
      } else {
        bucket.purchases += b.grandTotal;
        bucket.cashOut += b.paidAmount;
      }
    }

    for (const p of payments) {
      const mKey = p.date.slice(0, 7);
      const bucket = map.get(mKey);
      if (!bucket) continue;
      if (p.direction === 'received') {
        bucket.cashIn += p.amount;
      } else {
        bucket.cashOut += p.amount;
      }
    }

    return months;
  }, [bills, payments]);

  const maxVal = useMemo(() => {
    let m = 1000;
    for (const row of monthsData) {
      if (mode === 'sales_purchase') {
        m = Math.max(m, row.sales, row.purchases);
      } else {
        m = Math.max(m, row.cashIn, row.cashOut);
      }
    }
    return m * 1.15;
  }, [monthsData, mode]);

  const selected = activeIndex !== null ? monthsData[activeIndex] : monthsData[monthsData.length - 1];

  const primaryLabel = mode === 'sales_purchase' ? 'Sales' : 'Cash In';
  const secondaryLabel = mode === 'sales_purchase' ? 'Purchases' : 'Cash Out';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Len-Den Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            6-month comparison · Tap or hover any month to inspect figures
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('sales_purchase')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[36px] ${
              mode === 'sales_purchase'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales vs Purchase
          </button>
          <button
            type="button"
            onClick={() => setMode('cash_flow')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[36px] ${
              mode === 'cash_flow'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cash Flow (In vs Out)
          </button>
        </div>
      </div>

      {/* Selected month summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 mb-4 text-xs">
        <span className="font-semibold text-slate-800">{selected.label}</span>
        <div className="flex flex-wrap items-center gap-4 tabular-nums">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
            {primaryLabel}: {formatINR(mode === 'sales_purchase' ? selected.sales : selected.cashIn)}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
            <span
              className={`w-2.5 h-2.5 rounded-xs inline-block ${
                mode === 'sales_purchase' ? 'bg-slate-700' : 'bg-rose-600'
              }`}
            />
            {secondaryLabel}:{' '}
            {formatINR(mode === 'sales_purchase' ? selected.purchases : selected.cashOut)}
          </span>
        </div>
      </div>

      {/* Responsive Bar Chart */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[340px]">
          <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-44 pt-4 pb-1 border-b border-slate-200">
            {monthsData.map((row, idx) => {
              const valA = mode === 'sales_purchase' ? row.sales : row.cashIn;
              const valB = mode === 'sales_purchase' ? row.purchases : row.cashOut;
              const hA = Math.max(4, Math.round((valA / maxVal) * 100));
              const hB = Math.max(4, Math.round((valB / maxVal) * 100));
              const isSelected = (activeIndex ?? monthsData.length - 1) === idx;

              return (
                <button
                  key={row.key}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onFocus={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex(idx)}
                  className={`group flex flex-col items-center justify-end h-full rounded-lg px-1 pt-2 transition-colors cursor-pointer ${
                    isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-end justify-center gap-1.5 w-full h-32">
                    <div
                      className="w-3.5 sm:w-5 rounded-t-md bg-emerald-600 transition-all duration-200"
                      style={{height: `${valA === 0 ? 2 : hA}%`}}
                      title={`${primaryLabel}: ${formatINR(valA)}`}
                    />
                    <div
                      className={`w-3.5 sm:w-5 rounded-t-md transition-all duration-200 ${
                        mode === 'sales_purchase' ? 'bg-slate-700' : 'bg-rose-600'
                      }`}
                      style={{height: `${valB === 0 ? 2 : hB}%`}}
                      title={`${secondaryLabel}: ${formatINR(valB)}`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-6 gap-2 sm:gap-4 pt-2">
            {monthsData.map((row, idx) => {
              const isSelected = (activeIndex ?? monthsData.length - 1) === idx;
              return (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`text-center text-[11px] font-medium cursor-pointer truncate ${
                    isSelected ? 'text-emerald-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  {row.label.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
