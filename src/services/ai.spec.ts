import { describe, it, expect, beforeEach } from 'vitest';
import { products, sales, llmConfig } from '@/services/data';
import { askBuyerQuestion, detectCommand, fallbackAnswer } from '@/services/ai.service';
import { Product } from '@/types';
import { defaultLlm } from '@/services/seed';

function makeProduct(over: Partial<Product> = {}): Product {
  const now = new Date().toISOString();
  return {
    id: 'p1', name: '16mm膨胀螺丝(20颗/包)', barcode: '6900000000011', category: '五金',
    buyPrice: 1.2, price: 2.5, stock: 120, safeStock: 80, location: 'A1-3',
    desc: '用于墙面固定。', createdAt: now, updatedAt: now, ...over
  };
}

beforeEach(() => {
  products.value = [
    makeProduct(),
    makeProduct({ id: 'p2', name: '电工胶带', price: 2, location: 'A3-2' }),
    makeProduct({ id: 'p3', name: '儿童文具套装(9件)', category: '文具', price: 15, location: 'F1-1' }),
    makeProduct({ id: 'p4', name: '不锈钢水龙头(厨房款)', category: '卫浴', price: 45, location: 'B1-1' })
  ];
  sales.value = [];
  llmConfig.value = { ...defaultLlm, apiKey: '' };
});

describe('AI 服务（无 Key 降级）', () => {
  it('商品找货：返回货架位置与价格', async () => {
    const r = await askBuyerQuestion('16mm膨胀螺丝在哪');
    expect(r.demo).toBe(true);
    expect(r.source).toBe('local');
    expect(r.text).toContain('A1-3');
    expect(r.text).toContain('2.5');
  });

  it('场景清单：开学文具', () => {
    const r = fallbackAnswer('开学文具清单');
    expect(r.text).toContain('文具');
    expect(r.text).toContain('合计');
  });

  it('知识库：水龙头安装步骤', () => {
    const r = fallbackAnswer('水龙头怎么安装');
    expect(r.text).toContain('安装');
  });

  it('未知问题返回引导话术', async () => {
    const r = await askBuyerQuestion('今天天气怎么样');
    expect(r.text).toContain('店主');
  });

  it('语音指令：查库存', async () => {
    const res = await detectCommand('查扳手库存');
    expect(res.changed).toBe(false);
    expect(res.reply.text).toContain('库存');
  });

  it('语音指令：改价格并生效', async () => {
    const res = await detectCommand('改胶带价格为5');
    expect(res.changed).toBe(true);
    expect(products.value.find((p) => p.id === 'p2')!.price).toBe(5);
    expect(res.reply.text).toContain('5');
  });

  it('语音指令：本周报表', async () => {
    const res = await detectCommand('本周报表');
    expect(res.reply.text).toContain('热销');
  });

  it('语音指令：未知格式给出提示', async () => {
    const res = await detectCommand('你好呀');
    expect(res.reply.text).toContain('查');
  });
});
