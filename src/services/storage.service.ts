import { Preferences } from '@capacitor/preferences';

export const KEYS = {
  storeProfile: 'ss.storeProfile',
  llmConfig: 'ss.llmConfig',
  products: 'ss.products',
  sales: 'ss.sales',
  queries: 'ss.queries',
  promotions: 'ss.promotions',
  seeded: 'ss.seeded.v1'
} as const;

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const { value } = await Preferences.get({ key });
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(value) });
}

export async function removeKey(key: string): Promise<void> {
  await Preferences.remove({ key });
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
