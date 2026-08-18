import { ref } from 'vue';
import { Product, SaleRecord, CustomerQuery, Promotion, StoreProfile, LlmConfig } from '@/types';
import { KEYS, loadJSON, saveJSON, removeKey } from './storage.service';
import { defaultProfile, defaultLlm, seedProducts, seedPromotions, buildSeedSales } from './seed';
import { isDemoMode, supabase } from '@/lib/supabase';
import { useAuth } from '@/composables/useAuth';

export const products = ref<Product[]>([]); export const sales = ref<SaleRecord[]>([]); export const queries = ref<CustomerQuery[]>([]); export const promotions = ref<Promotion[]>([]);
export const storeProfile = ref<StoreProfile>({ ...defaultProfile });
// Retained only for backwards-compatible demo tests. Provider keys are never used in production.
export const llmConfig = ref<LlmConfig>({ ...defaultLlm, apiKey: '' });
export const loaded = ref(false); export const dataError = ref<string | null>(null);

const productFromRow = (row: any): Product => ({ id: row.id, name: row.name, barcode: row.barcode, category: row.category, buyPrice: Number(row.buy_price), price: Number(row.price), stock: row.stock, safeStock: row.safe_stock, location: row.location, desc: row.description, createdAt: row.created_at, updatedAt: row.updated_at });
const productToRow = (product: Product, storeId: string) => ({ id: product.id.startsWith('p_') ? undefined : product.id, store_id: storeId, name: product.name, barcode: product.barcode, category: product.category, buy_price: product.buyPrice, price: product.price, stock: product.stock, safe_stock: product.safeStock, location: product.location, description: product.desc, updated_at: product.updatedAt });
const saleFromRow = (row: any): SaleRecord => ({ id: row.id, productId: row.product_id, productName: row.product_name, qty: row.quantity, unitPrice: Number(row.unit_price), cost: Number(row.cost), total: Number(row.total), time: row.created_at });
const promotionFromRow = (row: any): Promotion => ({ id: row.id, title: row.title, detail: row.detail, active: row.active, createdAt: row.created_at });
const queryFromRow = (row: any): CustomerQuery => ({ id: row.id, content: row.content, answer: row.answer ?? '', demo: false, createdAt: row.created_at, provider: row.provider, model: row.model, latencyMs: row.latency_ms, sourceDocumentIds: row.source_document_ids ?? [], error: row.error });

export async function ensureSeeded(): Promise<void> {
  if (!isDemoMode) return;
  const seeded = await loadJSON<boolean>(KEYS.seeded, false); if (seeded) return;
  const seededProducts = seedProducts(); await saveJSON(KEYS.products, seededProducts); await saveJSON(KEYS.sales, buildSeedSales(seededProducts)); await saveJSON(KEYS.promotions, seedPromotions()); await saveJSON(KEYS.seeded, true);
}

async function loadDemo(): Promise<void> {
  await ensureSeeded(); const [p,s,q,pr,sp,lc] = await Promise.all([loadJSON<Product[]>(KEYS.products, []),loadJSON<SaleRecord[]>(KEYS.sales, []),loadJSON<CustomerQuery[]>(KEYS.queries, []),loadJSON<Promotion[]>(KEYS.promotions, []),loadJSON<StoreProfile>(KEYS.storeProfile,defaultProfile),loadJSON<LlmConfig>(KEYS.llmConfig,defaultLlm)]);
  products.value=p; sales.value=s; queries.value=q; promotions.value=pr; storeProfile.value=sp; llmConfig.value={...lc,apiKey:''};
}

async function loadSupabase(): Promise<void> {
  if (!supabase) { products.value=[]; sales.value=[]; queries.value=[]; promotions.value=[]; return; }
  const { currentStore, loadCurrentStore } = useAuth(); if (!currentStore.value) await loadCurrentStore(); const store = currentStore.value;
  if (!store) { products.value=[]; sales.value=[]; queries.value=[]; promotions.value=[]; return; }
  const [storeResult, productResult, saleResult, promotionResult, queryResult] = await Promise.all([
    supabase.from('stores').select('name,address,phone,hours,welcome').eq('id',store.id).single(), supabase.from('products').select('*').eq('store_id',store.id).order('updated_at',{ascending:false}), supabase.from('sales').select('*').eq('store_id',store.id).order('created_at',{ascending:false}).limit(300), supabase.from('promotions').select('*').eq('store_id',store.id).order('created_at',{ascending:false}), supabase.from('customer_queries').select('*').eq('store_id',store.id).order('created_at',{ascending:false}).limit(100)
  ]);
  for (const result of [storeResult,productResult,saleResult,promotionResult,queryResult]) if (result.error) throw result.error;
  const profile=storeResult.data; if (!profile) throw new Error('门店资料不存在'); storeProfile.value={name:profile.name,address:profile.address,phone:profile.phone,hours:profile.hours,welcome:profile.welcome}; products.value=(productResult.data??[]).map(productFromRow); sales.value=(saleResult.data??[]).map(saleFromRow); promotions.value=(promotionResult.data??[]).map(promotionFromRow); queries.value=(queryResult.data??[]).map(queryFromRow);
}

export async function loadAll(): Promise<void> { loaded.value=false; dataError.value=null; try { if (isDemoMode) await loadDemo(); else await loadSupabase(); } catch(error) { dataError.value=error instanceof Error?error.message:'数据加载失败'; products.value=[]; sales.value=[]; queries.value=[]; promotions.value=[]; } finally { loaded.value=true; } }
export async function loadPublicStore(slug: string): Promise<void> {
  if (isDemoMode) { await loadDemo(); return; }
  const base = import.meta.env.VITE_SUPABASE_URL?.trim(); const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim(); if (!base || !key) throw new Error('公开门店尚未配置');
  const response = await fetch(`${base}/functions/v1/public-store?slug=${encodeURIComponent(slug)}`, { headers: { apikey: key } }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error === 'store_not_found' ? '门店不存在' : '门店信息暂不可用');
  storeProfile.value = { name: payload.store.name, address: payload.store.address, phone: payload.store.phone, hours: payload.store.hours, welcome: payload.store.welcome }; products.value = (payload.products ?? []).map((row: any) => productFromRow({ ...row, id: `public-${row.name}`, barcode: '', buy_price: 0, safe_stock: 0, created_at: '', updated_at: '' })); promotions.value = (payload.promotions ?? []).map((row: any, index: number) => promotionFromRow({ ...row, id: `public-promo-${index}`, active: true, created_at: '' }));
}
function storeId(): string | null { return useAuth().currentStore.value?.id ?? null; }

export async function persistProducts(): Promise<void> { if (isDemoMode) return saveJSON(KEYS.products, products.value); if (!supabase || !storeId()) return; const rows=products.value.map((product)=>productToRow(product,storeId()!)); if(rows.length){const {error}=await supabase.from('products').upsert(rows,{onConflict:'id'});if(error)throw error;} }
export async function saveProduct(product: Product, isNew = false): Promise<Product> {
  if (isDemoMode) { await saveJSON(KEYS.products, products.value); return product; }
  if (!supabase || !storeId()) throw new Error('未选择门店');
  if (isNew) { const row = productToRow(product, storeId()!); Reflect.deleteProperty(row, 'id'); const { data, error } = await supabase.from('products').insert(row).select().single(); if (error) throw error; return productFromRow(data); }
  const { error } = await supabase.from('products').update(productToRow(product, storeId()!)).eq('id', product.id); if (error) throw error; return product;
}
export async function deleteRemoteProduct(id: string): Promise<void> { if (!isDemoMode && supabase) { const {error}=await supabase.from('products').delete().eq('id',id); if(error)throw error; } }
export async function persistSales(): Promise<void> { if (isDemoMode) return saveJSON(KEYS.sales, sales.value); }
export async function persistQueries(): Promise<void> { if (isDemoMode) return saveJSON(KEYS.queries, queries.value); }
export async function persistPromotions(): Promise<void> { if (isDemoMode) return saveJSON(KEYS.promotions, promotions.value); }
export async function persistProfile(): Promise<void> { if (isDemoMode) return saveJSON(KEYS.storeProfile,storeProfile.value); if(supabase&&storeId()){const {error}=await supabase.from('stores').update({name:storeProfile.value.name,address:storeProfile.value.address,phone:storeProfile.value.phone,hours:storeProfile.value.hours,welcome:storeProfile.value.welcome}).eq('id',storeId()!);if(error)throw error;} }
export async function persistLlm(): Promise<void> {
  if (isDemoMode) { await saveJSON(KEYS.llmConfig,{...llmConfig.value,apiKey:''}); return; }
  if (supabase && storeId()) { const provider=llmConfig.value.provider ?? 'deepseek'; const { error } = await supabase.from('ai_model_configs').upsert({ store_id: storeId()!, provider, model: llmConfig.value.model, base_url: llmConfig.value.baseUrl, enabled: true, is_default: true }, { onConflict: 'store_id,provider,model' }); if (error) throw error; }
}

export async function resetAll(): Promise<void> { if (!isDemoMode) throw new Error('生产数据不能从客户端重置'); await Promise.all([removeKey(KEYS.products),removeKey(KEYS.sales),removeKey(KEYS.queries),removeKey(KEYS.promotions),removeKey(KEYS.storeProfile),removeKey(KEYS.llmConfig),removeKey(KEYS.seeded)]); await loadAll(); }
export async function recordRemoteSale(productId: string, qty: number): Promise<SaleRecord> { if(!supabase) throw new Error('Supabase 尚未配置'); const {data,error}=await supabase.rpc('record_sale',{target_product_id:productId,requested_quantity:qty}); if(error)throw error; return saleFromRow(data); }
