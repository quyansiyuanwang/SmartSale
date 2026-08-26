import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./data', () => ({
  products: { value: [] },
  queries: { value: [] }
}));

vi.mock('./report.service', () => ({
  slowMoving: vi.fn(() => [])
}));

import { products, queries } from './data';
import { slowMoving } from './report.service';
import { businessInsights } from './insight.service';

const product = { id: 'p1', name: '不锈钢水龙头(厨房款)', barcode: '1', category: '卫浴', buyPrice: 25, price: 45, stock: 8, safeStock: 10, location: 'B1-1', desc: '', createdAt: '', updatedAt: '' };
const query = (id: string, content: string) => ({ id, content, answer: '', demo: true, createdAt: '', status: 'new' as const, followedAt: null });

describe('经营机会推导', () => {
  beforeEach(() => {
    products.value = [{ ...product }];
    queries.value = [];
    vi.mocked(slowMoving).mockReturnValue([]);
  });

  it('将低库存商品咨询识别为补货优先事项', () => {
    queries.value = [query('q1', '水龙头还有吗')];
    const insight = businessInsights()[0];
    expect(insight.kind).toBe('restock');
    expect(insight.queryIds).toEqual(['q1']);
  });

  it('将重复咨询识别为公开促销机会', () => {
    products.value[0].stock = 30;
    queries.value = [query('q1', '水龙头怎么安装'), query('q2', '水龙头多少钱')];
    expect(businessInsights()[0].kind).toBe('promotion');
  });

  it('将滞销商品的咨询识别为促销机会', () => {
    products.value[0].stock = 30;
    vi.mocked(slowMoving).mockReturnValue(products.value);
    queries.value = [query('q1', '水龙头在哪')];
    expect(businessInsights()[0].kind).toBe('promotion');
  });

  it('忽略已跟进的咨询', () => {
    queries.value = [{ ...query('q1', '水龙头在哪'), status: 'followed' }];
    expect(businessInsights()).toHaveLength(0);
  });
});
