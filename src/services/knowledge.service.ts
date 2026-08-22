import { products } from './data';
import { findProductByName } from './product.service';
import { KnowledgeHit, Product } from '@/types';
import { uid } from './storage.service';

interface GraphRelation {
  from: string;
  relation: string;
  to: string;
  keywords: RegExp;
}

const DOCUMENTS: Array<{ title: string; content: string; keywords: string[] }> = [
  {
    title: '厨房水龙头安装规范',
    content: '安装水龙头前先关闭水阀，接口缠生料带并确认冷热水管方向，安装后打开水阀检查是否渗漏。',
    keywords: ['水龙头', '安装', '漏水']
  },
  {
    title: '膨胀螺丝施工说明',
    content: '膨胀螺丝适用于混凝土和砖墙固定，先用 8mm 钻头打孔、清理孔洞，再敲入膨胀管并拧紧螺母。',
    keywords: ['膨胀螺丝', '打孔', '钻头', '固定']
  },
  {
    title: '家庭应急处理清单',
    content: '小伤口先使用碘伏消毒，再贴创可贴并保持干燥；严重或持续出血时应及时就医。',
    keywords: ['创可贴', '碘伏', '消毒', '伤口', '药箱']
  }
];

const GRAPH_RELATIONS: GraphRelation[] = [
  { from: '水龙头', relation: '配套工具', to: '扳手', keywords: /水龙头|厨房|安装/ },
  { from: '膨胀螺丝', relation: '需要工具', to: '冲击钻', keywords: /膨胀螺丝|打孔|装修/ },
  { from: '免钉胶', relation: '替代方案', to: '打孔安装', keywords: /免钉胶|粘|挂画/ },
  { from: '碘伏', relation: '搭配使用', to: '创可贴', keywords: /碘伏|创可贴|药箱|伤口/ }
];

export const knowledgeGraphEdges = GRAPH_RELATIONS.map(({ from, relation, to }) => ({ from, relation, to }));

function scoreProduct(product: Product, query: string): number {
  const fields = [product.name, product.category, product.location, product.desc];
  const matches = fields.filter((field) => query.includes(field) || field.includes(query)).length;
  const tokens = query.split(/[\s，。！？、,.!?]+/).filter(Boolean);
  const tokenMatches = tokens.filter((token) => fields.some((field) => field.includes(token))).length;
  return matches * 0.25 + tokenMatches * 0.15 + (product.name.includes(query) ? 0.5 : 0);
}

function productHit(product: Product, score: number): KnowledgeHit {
  return {
    id: `product:${product.id}`,
    kind: 'product',
    title: product.name,
    content: `${product.name}，${product.category}，售价 ¥${product.price.toFixed(2)}，库存 ${product.stock}，位于 ${product.location} 货架。${product.desc}`,
    score,
    relatedProductIds: [product.id]
  };
}

export function searchKnowledge(query: string, limit = 6): KnowledgeHit[] {
  const normalized = query.trim();
  if (!normalized) return [];

  const hits: KnowledgeHit[] = products.value
    .map((product) => ({ product, score: scoreProduct(product, normalized) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ product, score }) => productHit(product, Math.min(0.99, score)));

  DOCUMENTS.forEach((document) => {
    const matched = document.keywords.filter((keyword) => normalized.includes(keyword)).length;
    if (matched) {
      hits.push({
        id: `document:${document.title}`,
        kind: 'document',
        title: document.title,
        content: document.content,
        score: Math.min(0.95, 0.45 + matched * 0.12)
      });
    }
  });

  GRAPH_RELATIONS.forEach((relation) => {
    if (!relation.keywords.test(normalized)) return;
    const related = products.value.filter((product) => product.name.includes(relation.to) || product.desc.includes(relation.to));
    hits.push({
      id: `graph:${relation.from}:${relation.to}`,
      kind: 'graph',
      title: `${relation.from} → ${relation.relation} → ${relation.to}`,
      content: `${relation.from}与${relation.to}存在“${relation.relation}”关系。${related.length ? `店内可选：${related.map((item) => item.name).join('、')}。` : ''}`,
      score: 0.7,
      relatedProductIds: related.map((item) => item.id)
    });
  });

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function knowledgeStats(query = ''): { hitCount: number; graphEdges: number; products: number } {
  return { hitCount: query ? searchKnowledge(query).length : 0, graphEdges: knowledgeGraphEdges.length, products: products.value.length };
}

export function nearestProduct(query: string): Product | undefined {
  return findProductByName(query) ?? searchKnowledge(query).find((hit) => hit.kind === 'product')?.relatedProductIds?.map((id) => products.value.find((product) => product.id === id)).find(Boolean);
}

export function knowledgeRunId(): string {
  return uid('knowledge');
}
