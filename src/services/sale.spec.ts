import { describe, it, expect, beforeEach } from 'vitest';
import { products, sales } from '@/services/data';
import { recordSale, recordSaleByBarcode, todaySales } from '@/services/sale.service';
import { Product } from '@/types';

function makeProduct(over: Partial<Product> = {}): Product {
  const now = new Date().toISOString();
  return {
    id: 'p1', name: '电工胶带', barcode: '6900000000028', category: '五金',
    buyPrice: 1, price: 2, stock: 5, safeStock: 2, location: 'A3-2',
    desc: '', createdAt: now, updatedAt: now, ...over
  };
}

beforeEach(() => {
  products.value = [makeProduct()];
  sales.value = [];
});

describe('销售服务：扣库存与记录', () => {
  it('正常销售扣减库存并生成记录', async () => {
    const res = await recordSale('p1', 2);
    expect(res.ok).toBe(true);
    expect(res.sale!.total).toBe(4);
    expect(res.sale!.productName).toBe('电工胶带');
    expect(products.value[0].stock).toBe(3);
    expect(sales.value.length).toBe(1);
    expect(todaySales().length).toBe(1);
  });

  it('库存不足时拒绝销售', async () => {
    const res = await recordSale('p1', 99);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('库存不足');
    expect(products.value[0].stock).toBe(5);
    expect(sales.value.length).toBe(0);
  });

  it('数量非法时拒绝销售', async () => {
    expect((await recordSale('p1', 0)).ok).toBe(false);
    expect((await recordSale('p1', -1)).ok).toBe(false);
  });

  it('商品不存在时报错', async () => {
    const res = await recordSale('nope', 1);
    expect(res.ok).toBe(false);
  });

  it('支持按条码销售', async () => {
    const res = await recordSaleByBarcode('6900000000028', 1);
    expect(res.ok).toBe(true);
    expect(products.value[0].stock).toBe(4);
    const bad = await recordSaleByBarcode('000', 1);
    expect(bad.ok).toBe(false);
    expect(bad.error).toContain('未找到条码');
  });
});
