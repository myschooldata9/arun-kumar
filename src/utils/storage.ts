import {createEmptyData, createSeedData} from '../data/seedData';
import {AppData} from '../types';

const STORAGE_KEY = 'green_bill_book_data_v1';

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedData();
      saveAppData(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const fallback = createEmptyData();
    return {
      profile: {...fallback.profile, ...(parsed.profile || {})},
      items: Array.isArray(parsed.items) ? parsed.items : [],
      parties: Array.isArray(parsed.parties) ? parsed.parties : [],
      bills: Array.isArray(parsed.bills) ? parsed.bills : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      hasClearedDemo: Boolean(parsed.hasClearedDemo),
    };
  } catch {
    const seed = createSeedData();
    return seed;
  }
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save Green Bill Book data to localStorage', err);
  }
}

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getNextBillNumber(prefix: string, type: 'sale' | 'purchase', bills: AppData['bills']): string {
  const effectivePrefix = type === 'sale' ? (prefix || 'GBB').toUpperCase() : 'PUR';
  let maxNum = type === 'sale' ? 1000 : 400;
  for (const b of bills) {
    if (b.type !== type) continue;
    const match = b.billNumber.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `${effectivePrefix}-${String(maxNum + 1).padStart(4, '0')}`;
}
