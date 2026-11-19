import {Bill, BillItem, DiscountType, LedgerRow, Party, PaymentEntry, UnitType} from '../types';

export function formatINR(amount: number, showDecimals = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(safe);
}

/** Plain ASCII currency string for jsPDF built-in Helvetica font */
export function formatRsPDF(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safe));
  return `${safe < 0 ? '-' : ''}Rs. ${formatted}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function offsetDateISO(daysDelta: number, baseDate = new Date()): string {
  const dt = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + daysDelta);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthBounds(year: number, monthIndex0: number): {from: string; to: string} {
  const start = new Date(year, monthIndex0, 1);
  const end = new Date(year, monthIndex0 + 1, 0);
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return {from: fmt(start), to: fmt(end)};
}

export function getWeekStartISO(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  return offsetDateISO(diffToMon, now);
}

export function formatDisplayDate(iso: string): string {
  if (!iso) return '-';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString('en-IN', {month: 'short', year: 'numeric'});
}

export function sanitizePhoneForWhatsApp(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function calculateBillLine(params: {
  id: string;
  itemId?: string;
  name: string;
  unit: UnitType;
  qty: number;
  rate: number;
  purchaseRate: number;
  discountType: DiscountType;
  discountValue: number;
  gstPercent: number;
}): BillItem {
  const qty = Math.max(0, Number(params.qty) || 0);
  const rate = Math.max(0, Number(params.rate) || 0);
  const purchaseRate = Math.max(0, Number(params.purchaseRate) || 0);
  const discountValue = Math.max(0, Number(params.discountValue) || 0);
  const gstPercent = Math.max(0, Number(params.gstPercent) || 0);

  const gross = qty * rate;
  const rawDiscount =
    params.discountType === 'percent' ? (gross * Math.min(100, discountValue)) / 100 : discountValue;
  const discountAmount = Math.min(gross, round2(rawDiscount));
  const taxableAmount = round2(Math.max(0, gross - discountAmount));
  const gstAmount = round2((taxableAmount * gstPercent) / 100);
  const total = round2(taxableAmount + gstAmount);

  return {
    id: params.id,
    itemId: params.itemId,
    name: params.name,
    unit: params.unit,
    qty,
    rate,
    purchaseRate,
    discountType: params.discountType,
    discountValue,
    discountAmount,
    gstPercent,
    taxableAmount,
    gstAmount,
    total,
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computePartyNetBalance(
  party: Party,
  bills: Bill[],
  payments: PaymentEntry[]
): number {
  let balance = party.openingBalance || 0;

  for (const b of bills) {
    if (b.partyId !== party.id) continue;
    if (b.type === 'sale') {
      balance += b.balanceDue;
    } else {
      balance -= b.balanceDue;
    }
  }

  for (const p of payments) {
    if (p.partyId !== party.id) continue;
    if (p.direction === 'received') {
      balance -= p.amount;
    } else {
      balance += p.amount;
    }
  }

  return round2(balance);
}

export function buildPartyLedger(
  party: Party,
  bills: Bill[],
  payments: PaymentEntry[],
  fromDate?: string,
  toDate?: string
): {
  rows: LedgerRow[];
  openingForPeriod: number;
  closingBalance: number;
  totalBilledSale: number;
  totalBilledPurchase: number;
  totalPaidReceived: number;
  totalPaidGiven: number;
} {
  type RawEvent = Omit<LedgerRow, 'runningBalance'>;
  const events: RawEvent[] = [];

  for (const b of bills) {
    if (b.partyId !== party.id) continue;
    const isSale = b.type === 'sale';
    const impact = isSale ? b.balanceDue : -b.balanceDue;
    events.push({
      id: `bill-${b.id}`,
      date: b.date,
      createdAt: b.createdAt,
      kind: isSale ? 'sale' : 'purchase',
      title: `${isSale ? 'Sale Bill' : 'Purchase Bill'} #${b.billNumber}`,
      subtitle: `${b.paymentMode} · Total ${formatINR(b.grandTotal)}${
        b.paidAmount > 0 ? ` · Paid ${formatINR(b.paidAmount)}` : ''
      }`,
      billId: b.id,
      bill: b,
      balanceImpact: round2(impact),
      amountDisplay: b.grandTotal,
    });
  }

  for (const p of payments) {
    if (p.partyId !== party.id) continue;
    const isReceived = p.direction === 'received';
    events.push({
      id: `pay-${p.id}`,
      date: p.date,
      createdAt: p.createdAt,
      kind: isReceived ? 'payment_received' : 'payment_given',
      title: isReceived ? 'Payment Received' : 'Payment Given',
      subtitle: `${p.mode}${p.notes ? ` · ${p.notes}` : ''}`,
      payment: p,
      balanceImpact: round2(isReceived ? -p.amount : p.amount),
      amountDisplay: p.amount,
    });
  }

  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt.localeCompare(b.createdAt);
  });

  let running = round2(party.openingBalance || 0);
  let openingForPeriod = running;

  const rows: LedgerRow[] = [];
  let totalBilledSale = 0;
  let totalBilledPurchase = 0;
  let totalPaidReceived = 0;
  let totalPaidGiven = 0;

  for (const ev of events) {
    if (fromDate && ev.date < fromDate) {
      running = round2(running + ev.balanceImpact);
      openingForPeriod = running;
      continue;
    }
    if (toDate && ev.date > toDate) {
      continue;
    }

    running = round2(running + ev.balanceImpact);
    rows.push({
      ...ev,
      runningBalance: running,
    });

    if (ev.kind === 'sale' && ev.bill) {
      totalBilledSale += ev.bill.grandTotal;
    } else if (ev.kind === 'purchase' && ev.bill) {
      totalBilledPurchase += ev.bill.grandTotal;
    } else if (ev.kind === 'payment_received') {
      totalPaidReceived += ev.amountDisplay;
    } else if (ev.kind === 'payment_given') {
      totalPaidGiven += ev.amountDisplay;
    }
  }

  return {
    rows,
    openingForPeriod: round2(openingForPeriod),
    closingBalance: round2(running),
    totalBilledSale: round2(totalBilledSale),
    totalBilledPurchase: round2(totalBilledPurchase),
    totalPaidReceived: round2(totalPaidReceived),
    totalPaidGiven: round2(totalPaidGiven),
  };
}
