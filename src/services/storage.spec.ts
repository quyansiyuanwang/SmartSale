import { vi, beforeEach, describe, it, expect } from 'vitest';

const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: store.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => { store.set(key, value); }),
    remove: vi.fn(async ({ key }: { key: string }) => { store.delete(key); })
  }
}));

import { products, promotions, queries, loadPublicStore, publicStoreStatus } from '@/services/data';
import { loadAll, resetAll, ensureSeeded } from '@/services/data';
import { KEYS } from '@/services/storage.service';
import { createProduct, updateProduct, deleteProduct, deleteProducts, listProducts, adjustStock, findProductByBarcode } from '@/services/product.service';
import { ProductInput } from '@/types';
import { addQuery, markQueriesFollowed } from '@/services/query.service';
import { createPromotion, setPromotionActive, deletePromotion } from '@/services/promotion.service';
import { loadPublicAccessToken, loadPublicServiceSettings, savePublicServiceSettings } from '@/services/store.service';

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

  it('跟进顾客咨询并创建促销会写入本地演示数据', async () => {
    await loadAll();
    const query = await addQuery('水龙头在哪', '在 B1-1 货架。', true);
    await markQueriesFollowed([query.id]);
    expect(queries.value[0].status).toBe('followed');
    expect(JSON.parse(store.get(KEYS.queries)!)[0].status).toBe('followed');

    const promotion = await createPromotion({ title: '水龙头 · 顾客推荐', detail: '到店询问享专属优惠。' });
    expect(promotions.value[0].id).toBe(promotion.id);
    expect(JSON.parse(store.get(KEYS.promotions)!)[0].title).toBe('水龙头 · 顾客推荐');
  });

  it('促销启停与删除会同步到本地演示数据', async () => {
    await loadAll();
    const promotion = await createPromotion({ title: '限时 9 折', detail: '原价 10 → 9 元。' });
    const persistedPromotions = () => JSON.parse(store.get(KEYS.promotions)!) as Array<{ id: string; active: boolean }>;

    await setPromotionActive(promotion.id, false);
    expect(promotions.value.find((p) => p.id === promotion.id)!.active).toBe(false);
    expect(persistedPromotions().find((p) => p.id === promotion.id)?.active).toBe(false);

    await setPromotionActive(promotion.id, true);
    expect(promotions.value.find((p) => p.id === promotion.id)!.active).toBe(true);

    await deletePromotion(promotion.id);
    expect(promotions.value.some((p) => p.id === promotion.id)).toBe(false);
    expect(persistedPromotions().some((p) => p.id === promotion.id)).toBe(false);
  });

  it('演示模式支持暂停公开服务并在顾客端生效，重置后恢复', async () => {
    await loadAll();
    await savePublicServiceSettings({ serviceStatus: 'active', publicEnabled: false });
    expect((await loadPublicServiceSettings()).publicEnabled).toBe(false);

    const token = await loadPublicAccessToken();
    await expect(loadPublicStore('demo-store')).rejects.toThrow('顾客入口令牌无效');
    await loadPublicStore('demo-store', token);
    expect(publicStoreStatus.value).toBe('suspended');

    await savePublicServiceSettings({ serviceStatus: 'active', publicEnabled: true });
    await loadPublicStore('demo-store', token);
    expect(publicStoreStatus.value).toBe('active');

    await savePublicServiceSettings({ serviceStatus: 'active', publicEnabled: false });
    await resetAll();
    expect((await loadPublicServiceSettings()).publicEnabled).toBe(true);
    await loadPublicStore('demo-store', token);
    expect(publicStoreStatus.value).toBe('active');
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

  it('条码精确匹配已建档商品', async () => {
    await loadAll();
    const seeded = products.value.find((p) => p.barcode === '6900000000028')!;
    expect(findProductByBarcode('6900000000028')?.id).toBe(seeded.id);
    expect(findProductByBarcode(' 6900000000028 ')?.id).toBe(seeded.id);
    expect(findProductByBarcode('000')).toBeUndefined();
    expect(findProductByBarcode('')).toBeUndefined();
  });

  it('批量删除会同步商品列表与本地存储', async () => {
    await loadAll();
    const first = await createProduct({ ...input, barcode: 'batch-1' });
    const second = await createProduct({ ...input, barcode: 'batch-2', name: '第二个测试商品' });

    await deleteProducts([first.id, second.id, first.id]);

    expect(products.value.some((product) => product.id === first.id || product.id === second.id)).toBe(false);
    const persisted = JSON.parse(store.get(KEYS.products)!) as ProductInput[];
    expect(persisted.some((product) => product.barcode === 'batch-1' || product.barcode === 'batch-2')).toBe(false);
  });
});
