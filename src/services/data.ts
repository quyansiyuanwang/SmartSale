import { ref } from 'vue';
import { Product, SaleRecord, CustomerQuery, Promotion, StoreProfile, LlmConfig } from '@/types';
import { KEYS, loadJSON, saveJSON, removeKey } from './storage.service';
import { defaultProfile, defaultLlm, seedProducts, seedPromotions, buildSeedSales } from './seed';

export const products = ref<Product[]>([]);
export const sales = ref<SaleRecord[]>([]);
export const queries = ref<CustomerQuery[]>([]);
export const promotions = ref<Promotion[]>([]);
export const storeProfile = ref<StoreProfile>({ ...defaultProfile });
export const llmConfig = ref<LlmConfig>({ ...defaultLlm });
export const loaded = ref(false);

export async function ensureSeeded(): Promise<void> {
  const seeded = await loadJSON<boolean>(KEYS.seeded, false);
  if (seeded) return;
  const prods = seedProducts();
  await saveJSON(KEYS.products, prods);
  await saveJSON(KEYS.sales, buildSeedSales(prods));
  await saveJSON(KEYS.promotions, seedPromotions());
  await saveJSON(KEYS.seeded, true);
}

export async function loadAll(): Promise<void> {
  await ensureSeeded();
  const [p, s, q, pr, sp, lc] = await Promise.all([
    loadJSON<Product[]>(KEYS.products, []),
    loadJSON<SaleRecord[]>(KEYS.sales, []),
    loadJSON<CustomerQuery[]>(KEYS.queries, []),
    loadJSON<Promotion[]>(KEYS.promotions, []),
    loadJSON<StoreProfile>(KEYS.storeProfile, defaultProfile),
    loadJSON<LlmConfig>(KEYS.llmConfig, defaultLlm)
  ]);
  products.value = p;
  sales.value = s;
  queries.value = q;
  promotions.value = pr;
  storeProfile.value = sp;
  llmConfig.value = lc;
  loaded.value = true;
}

export async function persistProducts(): Promise<void> { await saveJSON(KEYS.products, products.value); }
export async function persistSales(): Promise<void> { await saveJSON(KEYS.sales, sales.value); }
export async function persistQueries(): Promise<void> { await saveJSON(KEYS.queries, queries.value); }
export async function persistPromotions(): Promise<void> { await saveJSON(KEYS.promotions, promotions.value); }
export async function persistProfile(): Promise<void> { await saveJSON(KEYS.storeProfile, storeProfile.value); }
export async function persistLlm(): Promise<void> { await saveJSON(KEYS.llmConfig, llmConfig.value); }

export async function resetAll(): Promise<void> {
  await Promise.all([
    removeKey(KEYS.products),
    removeKey(KEYS.sales),
    removeKey(KEYS.queries),
    removeKey(KEYS.promotions),
    removeKey(KEYS.storeProfile),
    removeKey(KEYS.llmConfig),
    removeKey(KEYS.seeded)
  ]);
  await loadAll();
}
