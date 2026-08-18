import { products, sales, persistProducts, persistSales, recordRemoteSale } from './data';
import { isDemoMode } from '@/lib/supabase';
import { SaleRecord } from '@/types';
import { uid, nowISO } from './storage.service';

export interface SaleResult {
  ok: boolean;
  sale?: SaleRecord;
  error?: string;
}

export async function recordSale(productId: string, qty: number): Promise<SaleResult> {
  const p = products.value.find((x) => x.id === productId);
  if (!p) return { ok: false, error: '商品不存在' };
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: '数量必须大于 0' };
  if (p.stock < qty) return { ok: false, error: `库存不足，当前仅剩 ${p.stock} 件` };

  if (!isDemoMode) {
    try {
      const sale = await recordRemoteSale(productId, qty);
      p.stock -= qty;
      p.updatedAt = nowISO();
      sales.value.unshift(sale);
      return { ok: true, sale };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '销售保存失败' };
    }
  }

  p.stock -= qty;
  p.updatedAt = nowISO();
  const sale: SaleRecord = {
    id: uid('s'),
    productId: p.id,
    productName: p.name,
    qty,
    unitPrice: p.price,
    cost: p.buyPrice,
    total: Math.round(p.price * qty * 100) / 100,
    time: nowISO()
  };
  sales.value.unshift(sale);
  await Promise.all([persistProducts(), persistSales()]);
  return { ok: true, sale };
}

export async function recordSaleByBarcode(barcode: string, qty: number): Promise<SaleResult> {
  const p = products.value.find((x) => x.barcode === barcode.trim());
  if (!p) return { ok: false, error: `未找到条码 ${barcode} 的商品` };
  return recordSale(p.id, qty);
}

export function todaySales(): SaleRecord[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const s = start.getTime();
  return sales.value.filter((r) => new Date(r.time).getTime() >= s);
}

export function recentSales(n = 30): SaleRecord[] {
  return sales.value.slice(0, n);
}
