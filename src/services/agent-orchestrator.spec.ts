import { beforeEach, describe, expect, it, vi } from 'vitest';

const memory = vi.hoisted(() => new Map<string, string>());

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: memory.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => { memory.set(key, value); }),
    remove: vi.fn(async ({ key }: { key: string }) => { memory.delete(key); })
  }
}));

import { products, queries } from '@/services/data';
import { seedProducts } from '@/services/seed';
import { runBuyerWorkflow, runStorekeeperWorkflow, workflowRuns } from '@/services/agent-orchestrator.service';

beforeEach(() => {
  memory.clear();
  products.value = seedProducts();
  queries.value = [];
  workflowRuns.value = [];
});

describe('双 Agent 协同编排', () => {
  it('顾客问答记录完整的云端模块轨迹并同步商家端', async () => {
    const { result, run } = await runBuyerWorkflow('水龙头怎么安装');

    expect(result.text).toContain('安装');
    expect(run.agent).toBe('shopping-advisor');
    expect(run.events.map((event) => event.module)).toEqual([
      'workflow-engine', 'knowledge-engine', 'llm-gateway', 'relational-db', 'collaboration-center'
    ]);
    expect(run.events.every((event) => event.status === 'success')).toBe(true);
    expect(queries.value[0].content).toBe('水龙头怎么安装');
  });

  it('商家指令修改商品后生成数据库与协同事件', async () => {
    const { result, run } = await runStorekeeperWorkflow('改胶带价格为5');

    expect(result.changed).toBe(true);
    expect(products.value.find((product) => product.name === '电工胶带')?.price).toBe(5);
    expect(run.events.map((event) => event.module)).toContain('collaboration-center');
    expect(run.events.map((event) => event.module)).toContain('relational-db');
    expect(run.output).toContain('5');
  });
});
