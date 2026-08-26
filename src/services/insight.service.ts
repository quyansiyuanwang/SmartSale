import { products, queries } from './data';
import { slowMoving } from './report.service';
import type { BusinessInsight, Product } from '@/types';

function compact(text: string): string {
  return text.replace(/[\s，。！？、,.!?？]/g, '').toLowerCase();
}

function queryProduct(content: string): Product | undefined {
  const normalized = compact(content);
  return products.value.find((product) => {
    const name = compact(product.name);
    const shortName = compact(product.name.split(/[（(]/)[0]);
    const chineseName = shortName.replace(/[a-z0-9]/g, '');
    const aliases: string[] = [];
    for (let index = 0; index < chineseName.length - 1; index += 1) aliases.push(chineseName.slice(index, index + 2));
    return normalized.includes(name) || normalized.includes(shortName) || aliases.some((alias) => normalized.includes(alias));
  });
}

export function businessInsights(): BusinessInsight[] {
  const openQueries = queries.value.filter((query) => query.status !== 'followed');
  const slowIds = new Set(slowMoving(14).map((product) => product.id));
  const grouped = new Map<string, { product: Product; queryIds: string[] }>();
  const unmatched: string[] = [];

  openQueries.forEach((query) => {
    const product = queryProduct(query.content);
    if (!product) {
      unmatched.push(query.id);
      return;
    }
    const current = grouped.get(product.id) ?? { product, queryIds: [] };
    current.queryIds.push(query.id);
    grouped.set(product.id, current);
  });

  const insights: BusinessInsight[] = [];
  grouped.forEach(({ product, queryIds }) => {
    if (product.stock <= product.safeStock) {
      insights.push({
        id: `restock-${product.id}`,
        kind: 'restock',
        title: `${product.name}需要补货`,
        detail: `${queryIds.length} 条顾客咨询正在关注，当前库存 ${product.stock}，安全库存 ${product.safeStock}。建议优先补货后再做导购。`,
        productId: product.id,
        productName: product.name,
        queryIds,
        actionLabel: '标记已跟进'
      });
      return;
    }
    if (queryIds.length >= 2 || slowIds.has(product.id)) {
      insights.push({
        id: `promotion-${product.id}`,
        kind: 'promotion',
        title: `${product.name}有转化机会`,
        detail: queryIds.length >= 2 ? `${queryIds.length} 位顾客正在询问该商品，可创建限时促销促进到店转化。` : '该商品近期动销偏慢，但已有顾客咨询，可用轻量促销推动成交。',
        productId: product.id,
        productName: product.name,
        queryIds,
        actionLabel: '生成公开促销'
      });
      return;
    }
    insights.push({
      id: `follow-up-${queryIds[0]}`,
      kind: 'follow-up',
      title: `跟进顾客对${product.name}的咨询`,
      detail: `商品现货 ${product.stock} 件，位于 ${product.location}。主动确认到店需求可提高转化。`,
      productId: product.id,
      productName: product.name,
      queryIds,
      actionLabel: '标记已跟进'
    });
  });

  if (unmatched.length) {
    insights.push({
      id: `demand-${unmatched[0]}`,
      kind: 'follow-up',
      title: '发现未覆盖的顾客需求',
      detail: `${unmatched.length} 条咨询未匹配现有商品，建议联系顾客并评估是否补充选品。`,
      queryIds: unmatched,
      actionLabel: '标记已跟进'
    });
  }
  return insights;
}
