export type UnitType = 'Kg' | 'Gram' | 'Litre' | 'Packet' | 'Dozen' | 'Piece' | 'Box';

export type ItemCategory = 'Grocery' | 'Medical' | 'Dairy' | 'Farming' | 'General';

export type DiscountType = 'percent' | 'flat';

export type PartyType = 'customer' | 'supplier' | 'both';

export type BillType = 'sale' | 'purchase';

export type PaymentMode = 'Cash' | 'UPI' | 'Credit';

export type MainTab = 'dashboard' | 'items' | 'party' | 'profile';

export interface BusinessProfile {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  upiId: string;
  invoicePrefix: string;
  terms: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  unit: UnitType;
  salePrice: number;
  purchasePrice: number;
  gstPercent: number;
  discountType: DiscountType;
  discountValue: number;
  stock: number;
  lowStockAlert: number;
  createdAt: string;
}

export interface Party {
  id: string;
  name: string;
  phone: string;
  type: PartyType;
  address: string;
  gstin: string;
  /** Positive = Receivable (Lena Hai), Negative = Payable (Dena Hai) */
  openingBalance: number;
  createdAt: string;
}

export interface BillItem {
  id: string;
  itemId?: string;
  name: string;
  unit: UnitType;
  qty: number;
  rate: number;
  purchaseRate: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  gstPercent: number;
  taxableAmount: number;
  gstAmount: number;
  total: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  type: BillType;
  partyId: string;
  partyName: string;
  partyPhone: string;
  date: string; // YYYY-MM-DD
  paymentMode: PaymentMode;
  items: BillItem[];
  subtotal: number;
  totalDiscount: number;
  totalGst: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  notes: string;
  createdAt: string;
}

export interface PaymentEntry {
  id: string;
  partyId: string;
  partyName: string;
  date: string; // YYYY-MM-DD
  direction: 'received' | 'given';
  amount: number;
  mode: 'Cash' | 'UPI' | 'Bank';
  notes: string;
  billId?: string;
  createdAt: string;
}

export interface AppData {
  profile: BusinessProfile;
  items: InventoryItem[];
  parties: Party[];
  bills: Bill[];
  payments: PaymentEntry[];
  hasClearedDemo?: boolean;
}

export interface LedgerRow {
  id: string;
  date: string;
  createdAt: string;
  kind: 'opening' | 'sale' | 'purchase' | 'payment_received' | 'payment_given';
  title: string;
  subtitle: string;
  billId?: string;
  bill?: Bill;
  payment?: PaymentEntry;
  /** Positive = increases Receivable (Lena Hai), Negative = increases Payable / reduces Receivable */
  balanceImpact: number;
  runningBalance: number;
  amountDisplay: number;
}
