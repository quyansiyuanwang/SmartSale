import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

type ProductInput = { name: string; barcode?: string; category?: string; buyPrice?: number; price: number; stock?: number; safeStock?: number; location?: string; desc?: string };
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function text(value: unknown, max = 500): string { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function number(value: unknown, fallback = 0): number { const parsed = typeof value === 'number' ? value : Number(value); return Number.isFinite(parsed) ? parsed : fallback; }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'unauthorized' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) return json({ error: 'unauthorized' }, 401);
    const body = await request.json(); const rows = Array.isArray(body.products) ? body.products : [];
    if (!rows.length || rows.length > 1000) return json({ error: 'invalid_product_count' }, 400);
    const { data: membership } = await admin.from('store_members').select('store_id,role').eq('user_id', auth.user.id).in('role', ['owner', 'manager']).limit(1).maybeSingle();
    if (!membership) return json({ error: 'not_permitted' }, 403);
    const errors: Array<{ row: number; message: string }> = []; const seenBarcodes = new Set<string>();
    const normalized = rows.map((raw: ProductInput, index: number) => {
      const name = text(raw.name, 160); const barcode = text(raw.barcode, 120); const price = number(raw.price, NaN); const buyPrice = number(raw.buyPrice); const stock = number(raw.stock); const safeStock = number(raw.safeStock);
      if (!name) errors.push({ row: index + 2, message: '商品名称不能为空' });
      if (!Number.isFinite(price) || price < 0) errors.push({ row: index + 2, message: '售价必须是大于等于 0 的数字' });
      if (buyPrice < 0 || stock < 0 || safeStock < 0 || !Number.isInteger(stock) || !Number.isInteger(safeStock)) errors.push({ row: index + 2, message: '进价不能为负数，库存必须为非负整数' });
      if (barcode && seenBarcodes.has(barcode)) errors.push({ row: index + 2, message: '文件内条码重复' }); seenBarcodes.add(barcode);
      return { store_id: membership.store_id, name, barcode, category: text(raw.category, 80), buy_price: buyPrice, price, stock, safe_stock: safeStock, location: text(raw.location, 120), description: text(raw.desc, 2000) };
    });
    if (errors.length) return json({ error: 'validation_failed', errors }, 422);
    const barcodes = normalized.map((item) => item.barcode).filter(Boolean);
    if (barcodes.length) { const { data: existing } = await admin.from('products').select('barcode').eq('store_id', membership.store_id).in('barcode', barcodes); if (existing?.length) return json({ error: 'validation_failed', errors: existing.map((item) => ({ row: 0, message: `条码 ${item.barcode} 已存在` })) }, 422); }
    const { data, error } = await admin.from('products').insert(normalized).select('id'); if (error) throw error;
    await admin.from('audit_events').insert({ store_id: membership.store_id, actor_id: auth.user.id, action: 'product.imported', entity_type: 'product', metadata: { count: data?.length ?? 0 } });
    return json({ imported: data?.length ?? 0 });
  } catch (error) { console.error('product import failed', error); return json({ error: 'import_unavailable', message: error instanceof Error ? error.message : 'unknown_error' }, 503); }
});
