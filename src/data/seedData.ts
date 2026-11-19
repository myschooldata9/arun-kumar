import {AppData, Bill, InventoryItem, Party, PaymentEntry} from '../types';
import {calculateBillLine, offsetDateISO, round2} from '../utils/formatters';

function buildBillFromSpecs(params: {
  id: string;
  billNumber: string;
  type: 'sale' | 'purchase';
  party: Party;
  date: string;
  paymentMode: 'Cash' | 'UPI' | 'Credit';
  lines: Array<{
    item: InventoryItem;
    qty: number;
    overrideDiscountValue?: number;
  }>;
  paidAmount?: number;
  notes?: string;
}): Bill {
  const items = params.lines.map((line, idx) => {
    const rate = params.type === 'sale' ? line.item.salePrice : line.item.purchasePrice;
    return calculateBillLine({
      id: `${params.id}-line-${idx + 1}`,
      itemId: line.item.id,
      name: line.item.name,
      unit: line.item.unit,
      qty: line.qty,
      rate,
      purchaseRate: line.item.purchasePrice,
      discountType: line.item.discountType,
      discountValue:
        line.overrideDiscountValue !== undefined
          ? line.overrideDiscountValue
          : line.item.discountValue,
      gstPercent: line.item.gstPercent,
    });
  });

  const subtotal = round2(items.reduce((acc, i) => acc + i.qty * i.rate, 0));
  const totalDiscount = round2(items.reduce((acc, i) => acc + i.discountAmount, 0));
  const totalGst = round2(items.reduce((acc, i) => acc + i.gstAmount, 0));
  const grandTotal = round2(items.reduce((acc, i) => acc + i.total, 0));

  const paidAmount =
    params.paidAmount !== undefined
      ? Math.min(grandTotal, params.paidAmount)
      : params.paymentMode === 'Credit'
      ? 0
      : grandTotal;

  const balanceDue = round2(Math.max(0, grandTotal - paidAmount));

  return {
    id: params.id,
    billNumber: params.billNumber,
    type: params.type,
    partyId: params.party.id,
    partyName: params.party.name,
    partyPhone: params.party.phone,
    date: params.date,
    paymentMode: params.paymentMode,
    items,
    subtotal,
    totalDiscount,
    totalGst,
    grandTotal,
    paidAmount,
    balanceDue,
    notes: params.notes || '',
    createdAt: `${params.date}T10:30:00`,
  };
}

export function createSeedData(): AppData {
  const today = new Date();
  const d0 = offsetDateISO(0, today);
  const d1 = offsetDateISO(-1, today);
  const d3 = offsetDateISO(-3, today);
  const d6 = offsetDateISO(-6, today);

  const prevMonthDate = (monthsAgo: number, day: number) => {
    const dt = new Date(today.getFullYear(), today.getMonth() - monthsAgo, Math.min(day, 28));
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const items: InventoryItem[] = [
    {
      id: 'item-1',
      name: 'Sharbati Wheat Flour (Atta)',
      category: 'Grocery',
      unit: 'Kg',
      salePrice: 44,
      purchasePrice: 36,
      gstPercent: 0,
      discountType: 'percent',
      discountValue: 0,
      stock: 420,
      lowStockAlert: 50,
      createdAt: prevMonthDate(3, 1),
    },
    {
      id: 'item-2',
      name: 'A2 Buffalo Fresh Milk',
      category: 'Dairy',
      unit: 'Litre',
      salePrice: 72,
      purchasePrice: 58,
      gstPercent: 0,
      discountType: 'percent',
      discountValue: 0,
      stock: 85,
      lowStockAlert: 20,
      createdAt: prevMonthDate(3, 1),
    },
    {
      id: 'item-3',
      name: 'DAP Fertilizer Bag (50 Kg)',
      category: 'Farming',
      unit: 'Box',
      salePrice: 1350,
      purchasePrice: 1190,
      gstPercent: 5,
      discountType: 'flat',
      discountValue: 0,
      stock: 34,
      lowStockAlert: 10,
      createdAt: prevMonthDate(3, 2),
    },
    {
      id: 'item-4',
      name: 'Dolo 650mg Paracetamol Strip',
      category: 'Medical',
      unit: 'Packet',
      salePrice: 34,
      purchasePrice: 24,
      gstPercent: 12,
      discountType: 'percent',
      discountValue: 5,
      stock: 140,
      lowStockAlert: 25,
      createdAt: prevMonthDate(3, 2),
    },
    {
      id: 'item-5',
      name: 'Fortune Kachi Ghani Mustard Oil',
      category: 'Grocery',
      unit: 'Litre',
      salePrice: 168,
      purchasePrice: 142,
      gstPercent: 5,
      discountType: 'percent',
      discountValue: 2,
      stock: 64,
      lowStockAlert: 15,
      createdAt: prevMonthDate(3, 3),
    },
    {
      id: 'item-6',
      name: 'Desi Cow Pure Ghee (1L Jar)',
      category: 'Dairy',
      unit: 'Litre',
      salePrice: 680,
      purchasePrice: 560,
      gstPercent: 12,
      discountType: 'flat',
      discountValue: 20,
      stock: 18,
      lowStockAlert: 8,
      createdAt: prevMonthDate(3, 3),
    },
    {
      id: 'item-7',
      name: 'Hybrid Maize Seed Pack',
      category: 'Farming',
      unit: 'Packet',
      salePrice: 480,
      purchasePrice: 390,
      gstPercent: 0,
      discountType: 'percent',
      discountValue: 0,
      stock: 9,
      lowStockAlert: 12,
      createdAt: prevMonthDate(3, 4),
    },
    {
      id: 'item-8',
      name: 'Toor Dal Unpolished',
      category: 'Grocery',
      unit: 'Kg',
      salePrice: 156,
      purchasePrice: 132,
      gstPercent: 0,
      discountType: 'percent',
      discountValue: 0,
      stock: 195,
      lowStockAlert: 30,
      createdAt: prevMonthDate(3, 5),
    },
    {
      id: 'item-9',
      name: 'Vitamin C + Zinc Tablets',
      category: 'Medical',
      unit: 'Packet',
      salePrice: 85,
      purchasePrice: 58,
      gstPercent: 12,
      discountType: 'percent',
      discountValue: 10,
      stock: 72,
      lowStockAlert: 15,
      createdAt: prevMonthDate(3, 5),
    },
    {
      id: 'item-10',
      name: 'Farm Fresh Brown Eggs',
      category: 'Dairy',
      unit: 'Dozen',
      salePrice: 96,
      purchasePrice: 76,
      gstPercent: 0,
      discountType: 'percent',
      discountValue: 0,
      stock: 46,
      lowStockAlert: 10,
      createdAt: prevMonthDate(3, 6),
    },
  ];

  const parties: Party[] = [
    {
      id: 'party-1',
      name: 'Ramesh Patel Kirana',
      phone: '9825011223',
      type: 'customer',
      address: 'Station Road, Anand, Gujarat',
      gstin: '24AABPR4412K1Z5',
      openingBalance: 1500,
      createdAt: prevMonthDate(3, 1),
    },
    {
      id: 'party-2',
      name: 'Annapurna Dairy & Sweets',
      phone: '9879144556',
      type: 'customer',
      address: 'Main Bazaar, Vidyanagar',
      gstin: '',
      openingBalance: 0,
      createdAt: prevMonthDate(3, 2),
    },
    {
      id: 'party-3',
      name: 'Suresh Verma Farm',
      phone: '9426377889',
      type: 'both',
      address: 'Village Chaklasi, Kheda',
      gstin: '',
      openingBalance: 800,
      createdAt: prevMonthDate(3, 2),
    },
    {
      id: 'party-4',
      name: 'Mahalaxmi Agro Wholesalers',
      phone: '9898233445',
      type: 'supplier',
      address: 'APMC Market Yard, Plot 14',
      gstin: '24AAKFM8891D1Z2',
      openingBalance: -3500,
      createdAt: prevMonthDate(3, 1),
    },
    {
      id: 'party-5',
      name: 'MedPlus Pharma Distributors',
      phone: '9925066778',
      type: 'supplier',
      address: 'GIDC Pharma Zone, Vadodara',
      gstin: '24AABCM7721Q1Z9',
      openingBalance: -1200,
      createdAt: prevMonthDate(3, 1),
    },
    {
      id: 'party-6',
      name: 'Kaveri Medical Store',
      phone: '9714588990',
      type: 'customer',
      address: 'Hospital Chowk, Nadiad',
      gstin: '24AGFPK2201L1Z4',
      openingBalance: 0,
      createdAt: prevMonthDate(2, 5),
    },
  ];

  const bills: Bill[] = [
    // Today's bills
    buildBillFromSpecs({
      id: 'bill-101',
      billNumber: 'GBB-1014',
      type: 'sale',
      party: parties[0],
      date: d0,
      paymentMode: 'Credit',
      paidAmount: 1000,
      lines: [
        {item: items[0], qty: 40},
        {item: items[4], qty: 12},
        {item: items[7], qty: 15},
      ],
      notes: 'Morning wholesale delivery',
    }),
    buildBillFromSpecs({
      id: 'bill-102',
      billNumber: 'GBB-1015',
      type: 'sale',
      party: parties[1],
      date: d0,
      paymentMode: 'UPI',
      lines: [
        {item: items[1], qty: 35},
        {item: items[5], qty: 4},
        {item: items[9], qty: 10},
      ],
      notes: 'Daily dairy counter supply',
    }),
    buildBillFromSpecs({
      id: 'bill-103',
      billNumber: 'PUR-0412',
      type: 'purchase',
      party: parties[3],
      date: d0,
      paymentMode: 'Credit',
      paidAmount: 2000,
      lines: [
        {item: items[0], qty: 80},
        {item: items[4], qty: 20},
      ],
      notes: 'Fresh stock restock',
    }),

    // Yesterday & this week
    buildBillFromSpecs({
      id: 'bill-104',
      billNumber: 'GBB-1012',
      type: 'sale',
      party: parties[2],
      date: d1,
      paymentMode: 'Credit',
      lines: [
        {item: items[2], qty: 4},
        {item: items[6], qty: 6},
      ],
      notes: 'Rabi season inputs',
    }),
    buildBillFromSpecs({
      id: 'bill-105',
      billNumber: 'GBB-1011',
      type: 'sale',
      party: parties[5],
      date: d3,
      paymentMode: 'Cash',
      lines: [
        {item: items[3], qty: 30},
        {item: items[8], qty: 20},
      ],
    }),
    buildBillFromSpecs({
      id: 'bill-106',
      billNumber: 'PUR-0409',
      type: 'purchase',
      party: parties[4],
      date: d6,
      paymentMode: 'Credit',
      lines: [
        {item: items[3], qty: 60},
        {item: items[8], qty: 40},
      ],
    }),

    // Earlier this month (if day > 8, else last month)
    buildBillFromSpecs({
      id: 'bill-107',
      billNumber: 'GBB-1009',
      type: 'sale',
      party: parties[0],
      date: prevMonthDate(0, Math.max(1, Math.min(today.getDate() - 2, 10))),
      paymentMode: 'UPI',
      lines: [
        {item: items[7], qty: 25},
        {item: items[5], qty: 3},
      ],
    }),

    // 1 Month Ago
    buildBillFromSpecs({
      id: 'bill-201',
      billNumber: 'GBB-0982',
      type: 'sale',
      party: parties[0],
      date: prevMonthDate(1, 6),
      paymentMode: 'Cash',
      lines: [
        {item: items[0], qty: 100},
        {item: items[4], qty: 30},
        {item: items[7], qty: 40},
      ],
    }),
    buildBillFromSpecs({
      id: 'bill-202',
      billNumber: 'GBB-0988',
      type: 'sale',
      party: parties[2],
      date: prevMonthDate(1, 14),
      paymentMode: 'Credit',
      paidAmount: 3000,
      lines: [
        {item: items[2], qty: 6},
        {item: items[6], qty: 8},
      ],
    }),
    buildBillFromSpecs({
      id: 'bill-203',
      billNumber: 'GBB-0991',
      type: 'sale',
      party: parties[1],
      date: prevMonthDate(1, 22),
      paymentMode: 'UPI',
      lines: [
        {item: items[1], qty: 80},
        {item: items[5], qty: 8},
        {item: items[9], qty: 24},
      ],
    }),
    buildBillFromSpecs({
      id: 'bill-204',
      billNumber: 'PUR-0381',
      type: 'purchase',
      party: parties[3],
      date: prevMonthDate(1, 5),
      paymentMode: 'UPI',
      lines: [
        {item: items[0], qty: 150},
        {item: items[2], qty: 8},
        {item: items[4], qty: 40},
      ],
    }),
    buildBillFromSpecs({
      id: 'bill-205',
      billNumber: 'PUR-0389',
      type: 'purchase',
      party: parties[2],
      date: prevMonthDate(1, 18),
      paymentMode: 'Credit',
      lines: [{item: items[1], qty: 90}],
      notes: 'Purchased farm milk batch',
    }),

    // 2 Months Ago
    buildBillFromSpecs({
      id: 'bill-301',
      billNumber: 'GBB-0941',
      type: 'sale',
      party: parties[5],
      date: prevMonthDate(2, 9),
      paymentMode: 'UPI',
      lines: [
        {item: items[3], qty: 90},
        {item: items[8], qty: 50},
      ],
    }),
    buildBillFromSpecs({
      id: 'bill-302',
      billNumber: 'GBB-0952',
      type: 'sale',
      party: parties[0],
      date: prevMonthDate(2, 19),
      paymentMode: 'Cash',
      lines: [
        {item: items[0], qty: 120},
        {item: items[7], qty: 50},
        {item: items[4], qty: 25},
      ],
    }),
    buildBillFromSpecs({
      id: 'bill-303',
      billNumber: 'PUR-0345',
      type: 'purchase',
      party: parties[4],
      date: prevMonthDate(2, 4),
      paymentMode: 'Cash',
      lines: [
        {item: items[3], qty: 100},
        {item: items[8], qty: 60},
      ],
    }),
    buildBillFromSpecs({
      id: 'bill-304',
      billNumber: 'PUR-0351',
      type: 'purchase',
      party: parties[3],
      date: prevMonthDate(2, 15),
      paymentMode: 'Credit',
      paidAmount: 5000,
      lines: [
        {item: items[0], qty: 140},
        {item: items[7], qty: 60},
      ],
    }),

    // 3 Months Ago
    buildBillFromSpecs({
      id: 'bill-401',
      billNumber: 'GBB-0901',
      type: 'sale',
      party: parties[1],
      date: prevMonthDate(3, 12),
      paymentMode: 'Cash',
      lines: [
        {item: items[1], qty: 70},
        {item: items[5], qty: 6},
        {item: items[9], qty: 20},
      ],
    }),
    buildBillFromSpecs({
      id: 'bill-402',
      billNumber: 'PUR-0301',
      type: 'purchase',
      party: parties[3],
      date: prevMonthDate(3, 8),
      paymentMode: 'Cash',
      lines: [
        {item: items[5], qty: 10},
        {item: items[9], qty: 30},
      ],
    }),
  ];

  const payments: PaymentEntry[] = [
    {
      id: 'pay-1',
      partyId: parties[0].id,
      partyName: parties[0].name,
      date: d1,
      direction: 'received',
      amount: 1200,
      mode: 'UPI',
      notes: 'Old balance partial settlement',
      createdAt: `${d1}T16:20:00`,
    },
    {
      id: 'pay-2',
      partyId: parties[3].id,
      partyName: parties[3].name,
      date: d3,
      direction: 'given',
      amount: 2500,
      mode: 'Bank',
      notes: 'NEFT payment to APMC supplier',
      createdAt: `${d3}T14:00:00`,
    },
  ];

  return {
    profile: {
      businessName: 'Kisan Agro & Kirana Kendra',
      ownerName: 'Maheshbhai Patel',
      phone: '9825099887',
      email: 'kisan.kendra@example.in',
      address: 'Shop 12, Sardar Patel Market, Station Road, Anand, Gujarat 388001',
      gstin: '24ABCPK1234F1Z8',
      upiId: 'kisankendra@upi',
      invoicePrefix: 'GBB',
      terms: 'Goods once sold will not be taken back. Payment due within 15 days for credit bills.',
    },
    items,
    parties,
    bills,
    payments,
    hasClearedDemo: false,
  };
}

export function createEmptyData(): AppData {
  return {
    profile: {
      businessName: 'My Business Store',
      ownerName: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      upiId: '',
      invoicePrefix: 'GBB',
      terms: 'Thank you for your business.',
    },
    items: [],
    parties: [],
    bills: [],
    payments: [],
    hasClearedDemo: true,
  };
}
