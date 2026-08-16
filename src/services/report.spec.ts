import { describe, it, expect, beforeEach } from 'vitest';
import { products, sales } from '@/services/data';
import { summaryIn, topProducts, slowMoving, lowStock, mondayOf, weeklyReport, weeklyRange } from '@/services/report.service';
import { Product, SaleRecord } from '@/types';

function makeProduct(over: Partial<Product> = {}): Product {
  const now = new Date().toISOString();
  return {
    id: 'p1', name: '电工胶带', barcode: '1', category: '五金',
    buyPrice: 1, price: 2, stock: 10, safeStock: 2, location: 'A3-2',
    desc: '', createdAt: now, updatedAt: now, ...over
  };
}

function makeSale(over: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: 's1', productId: 'p1', productName: '电工胶带', qty: 1,
    unitPrice: 2, cost: 1, total: 2, time: new Date('2026-08-10T10:00:00Z').toISOString(), ...over
  };
}

beforeEach(() => {
  products.value = [];
  sales.value = [];
});

describe('报表服务', () => {
  it('summaryIn 统计件数/营业额/毛利', () => {
    products.value = [makeProduct()];
    sales.value = [
      makeSale({ id: 'a', qty: 2, total: 4, time: new Date('2026-08-10T10:00:00Z').toISOString() }),
      makeSale({ id: 'b', qty: 1, total: 2, time: new Date('2026-08-12T10:00:00Z').toISOString() }),
      makeSale({ id: 'c', qty: 1, total: 2, time: new Date('2026-08-20T10:00:00Z').toISOString() })
    ];
    const from = new Date('2026-08-10T00:00:00Z');
    const to = new Date('2026-08-17T00:00:00Z');
    const s = summaryIn(from, to);
    // 前两条在范围内：qty=3, revenue=6, profit=(2-1)*3=3
    expect(s.count).toBe(3);
    expect(s.revenue).toBe(6);
    expect(s.profit).toBe(3);
  });

  it('topProducts 按销量排序且限定数量', () => {
    products.value = [makeProduct({ id: 'p1', name: 'A' }), makeProduct({ id: 'p2', name: 'B' })];
    const from = new Date('2026-08-01T00:00:00Z');
    const to = new Date('2026-08-31T00:00:00Z');
    sales.value = [
      makeSale({ productId: 'p1', name: 'A' } as any),
      makeSale({ id: 'x', productId: 'p2', productName: 'B', time: from.toISOString() }),
      makeSale({ id: 'y', productId: 'p2', productName: 'B', time: from.toISOString() })
    ];
    const top = topProducts(from, to, 1);
    expect(top.length).toBe(1);
    expect(top[0].productId).toBe('p2');
  });

  it('slowMoving 找出近 14 天无销量的在库商品', () => {
    const now = new Date();
    products.value = [
      makeProduct({ id: 'p1', name: '有销量', stock: 5 }),
      makeProduct({ id: 'p2', name: '滞销品', stock: 8 }),
      makeProduct({ id: 'p3', name: '零库存', stock: 0 })
    ];
    sales.value = [makeSale({ productId: 'p1', time: new Date(now.getTime() - 1000 * 60 * 60).toISOString() })];
    const slow = slowMoving(14);
    expect(slow.map((p) => p.id)).toEqual(['p2']);
  });

  it('lowStock 返回低于安全库存商品', () => {
    products.value = [
      makeProduct({ id: 'p1', stock: 1, safeStock: 2 }),
      makeProduct({ id: 'p2', stock: 5, safeStock: 2 })
    ];
    const low = lowStock();
    expect(low.length).toBe(1);
    expect(low[0].id).toBe('p1');
  });

  it('mondayOf 与 weeklyRange 边界正确', () => {
    // 2026-08-16 为星期日（若日期假设有偏差，逻辑验证：返回日必须为周一，且距输入 < 7 天）
    const d = new Date('2026-08-16T12:00:00Z');
    const m = mondayOf(d);
    expect(m.getDay()).toBe(1);
    expect(d.getTime() - m.getTime()).toBeGreaterThanOrEqual(0);
    expect(d.getTime() - m.getTime()).toBeLessThan(7 * 24 * 3600 * 1000);

    const { from, to } = weeklyRange(m);
    expect(to.getTime() - from.getTime()).toBe(7 * 24 * 3600 * 1000);
  });

  it('weeklyReport 返回完整结构', () => {
    products.value = [makeProduct()];
    sales.value = [makeSale()];
    const r = weeklyReport(new Date());
    expect(r.summary).toBeDefined();
    expect(Array.isArray(r.top)).toBe(true);
    expect(Array.isArray(r.slow)).toBe(true);
    expect(typeof r.from).toBe('string');
  });
});
