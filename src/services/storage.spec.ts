import { vi, beforeEach, describe, it, expect } from 'vitest';

const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: store.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => { store.set(key, value); }),
    remove: vi.fn(async ({ key }: { key: string }) => { store.delete(key); })
  }
}));

import { products } from '@/services/data';
import { loadAll, resetAll, ensureSeeded } from '@/services/data';
import { KEYS } from '@/services/storage.service';
import { createProduct, updateProduct, deleteProduct, listProducts, adjustStock } from '@/services/product.service';
import { ProductInput } from '@/types';

const input: ProductInput = {
  name: '测试商品', barcode: '999', category: '五金',
  buyPrice: 2, price: 5, stock: 10, safeStock: 3, location: 'Z9-9', desc: '测试描述'
};

beforeEach(() => {
  store.clear();
});

describe('存储与种子数据', () => {
  it('首次加载写入演示数据，再次加载不重复', async () => {
    await loadAll();
    expect(products.value.length).toBe(20);
    expect(store.has(KEYS.seeded)).toBe(true);
    await loadAll();
    expect(products.value.length).toBe(20);
  });

  it('ensureSeeded 幂等', async () => {
    await ensureSeeded();
    await ensureSeeded();
    expect(JSON.parse(store.get(KEYS.products)!).length).toBe(20);
  });

  it('resetAll 恢复初始演示数据', async () => {
    await loadAll();
    await createProduct(input);
    expect(products.value.length).toBe(21);
    await resetAll();
    expect(products.value.length).toBe(20);
    expect(products.value.some((p) => p.name === '测试商品')).toBe(false);
  });
});

describe('商品服务', () => {
  it('增删改查与搜索', async () => {
    await loadAll();
    const p = await createProduct(input);
    expect(listProducts('测试').some((x) => x.id === p.id)).toBe(true);
    expect(listProducts('999').some((x) => x.id === p.id)).toBe(true);

    const updated = await updateProduct(p.id, { price: 6.5 });
    expect(updated!.price).toBe(6.5);

    await adjustStock(p.id, -100);
    expect(products.value.find((x) => x.id === p.id)!.stock).toBe(0);

    await deleteProduct(p.id);
    expect(products.value.some((x) => x.id === p.id)).toBe(false);
  });
});
