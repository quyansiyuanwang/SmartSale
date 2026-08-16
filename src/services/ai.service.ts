import { products, promotions, storeProfile, llmConfig } from './data';
import { Product, AiReply } from '@/types';
import { findProductByName, updateProduct } from './product.service';
import { topProducts, slowMoving, fmtMoney } from './report.service';
import { hasApiKey } from './store.service';

interface SceneDef {
  keywords: RegExp;
  title: string;
  items: Array<{ name: string; qty: number }>;
}

const SCENES: SceneDef[] = [
  {
    keywords: /装修|卫生间|厨房改造|新房|改造/,
    title: '装修 / 卫生间改造购物清单',
    items: [
      { name: '不锈钢水龙头(厨房款)', qty: 1 },
      { name: '冲击钻(600W)', qty: 1 },
      { name: '16mm膨胀螺丝(20颗/包)', qty: 2 },
      { name: '电工胶带', qty: 2 },
      { name: '免钉胶(50ml)', qty: 1 },
      { name: '公制扳手(12件套)', qty: 1 }
    ]
  },
  {
    keywords: /开学|文具|书包|学习用品/,
    title: '开学文具清单',
    items: [
      { name: '儿童文具套装(9件)', qty: 1 },
      { name: 'A4笔记本(5本装)', qty: 1 },
      { name: '中性笔(10支装)', qty: 2 },
      { name: '保温杯(1500ml)', qty: 1 }
    ]
  },
  {
    keywords: /药箱|医药|消毒|创可贴|应急|摔伤|受伤|药/,
    title: '家庭应急药箱清单',
    items: [
      { name: '碘伏消毒液(100ml)', qty: 2 },
      { name: '创可贴(100片)', qty: 1 }
    ]
  },
  {
    keywords: /100元|100块|一百|预算|工具箱|工具套装/,
    title: '100 元以内工具组合',
    items: [
      { name: '家庭工具箱(85件套)', qty: 1 },
      { name: '免钉胶(50ml)', qty: 1 },
      { name: '电工胶带', qty: 1 }
    ]
  }
];

const KNOWLEDGE: Array<{ keywords: string[]; text: string }> = [
  {
    keywords: ['水龙头', '安装'],
    text: '安装步骤：①关掉水阀；②用扳手拆下旧水龙头；③接口缠上生料带；④装好新品并拧紧（冷热水管别接反）；⑤开阀试水检查是否渗漏。店内「不锈钢水龙头(厨房款)」¥45 在 B1-1 货架，含安装配件，需要扳手的话也有 12 件套 ¥29.9（B2-1）。'
  },
  {
    keywords: ['膨胀螺丝', '怎么用', '使用'],
    text: '膨胀螺丝用法：①墙面标记位置；②用冲击钻配 8mm 钻头打孔；③清灰后把膨胀管敲入；④拧紧螺母即可。店内「16mm膨胀螺丝(20颗/包)」¥2.5 在 A1-3 货架，冲击钻 ¥199 在 C2-1，可免费借用钻头。'
  },
  {
    keywords: ['免钉胶', '粘', '打孔'],
    text: '免钉胶用法：表面擦干保持干燥 → 挤出胶水 → 按压贴合，固定 24 小时后再承重；适用于瓷砖、玻璃、木材。店内「免钉胶(50ml)」¥12 在 A2-2 货架；不想打孔挂画、贴挂钩都可以用它。'
  },
  {
    keywords: ['创可贴', '碘伏', '消毒', '伤口'],
    text: '小伤口处理：先用「碘伏消毒液」清洗消毒，再贴「创可贴」，每天换 1 次保持干燥。店里碘伏 ¥8（D1-2）、创可贴 100 片 ¥6（D1-1），都在医药区。'
  },
  {
    keywords: ['冲击钻', '打孔', '钻头'],
    text: '冲击钻(600W) ¥199 在 C2-1 货架，附 10 支常用钻头。打孔技巧：先标记位置 → 选对钻头 → 开冲击档缓慢推进；混凝土墙面建议先用小钻头引孔再换大钻头。'
  }
];

function activePromotions(): string {
  return promotions.value
    .filter((p) => p.active)
    .map((p) => `${p.title}：${p.detail}`)
    .join('；');
}

function systemPrompt(): string {
  const sp = storeProfile.value;
  return (
    `你是「智购顾问」，${sp.name}（${sp.address}，营业时间 ${sp.hours}）的 AI 导购员，通过网页/扫码为到店顾客服务。\n` +
    `回答要求：\n` +
    `1. 简洁、口语化、用短句或分点，涉及商品必须给出货架位置与价格；\n` +
    `2. 只能依据用户消息里提供的商品清单与促销信息回答，严禁编造商品、价格、库存；\n` +
    `3. 缺货或库存低时，主动推荐同类替代品；\n` +
    `4. 顾客问"怎么用/怎么装"时给出实用步骤；\n` +
    `5. 超出店铺经营范围的问题，礼貌说明并建议询问店主。`
  );
}

function catalogPrompt(question: string): string {
  const catalog = products.value.map((p) => ({
    name: p.name,
    category: p.category,
    price: p.price,
    stock: p.stock,
    location: p.location,
    desc: p.desc.slice(0, 80)
  }));
  return JSON.stringify({
    question,
    catalog,
    promotions: activePromotions()
  });
}

async function callDeepSeek(system: string, user: string): Promise<string> {
  const cfg = llmConfig.value;
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs || 30000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: cfg.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.4
      }),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('empty content');
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

export async function askBuyerQuestion(question: string): Promise<AiReply> {
  const q = question.trim();
  if (!q) return { text: '请先告诉我您想找什么，比如「16mm膨胀螺丝在哪」。', demo: true, source: 'local' };
  if (hasApiKey()) {
    try {
      const text = await callDeepSeek(systemPrompt(), catalogPrompt(q));
      if (text) return { text, demo: false, source: 'ai' };
    } catch {
      // 网络/Key 异常时降级本地回答
    }
  }
  return fallbackAnswer(q);
}

function extractProductQuery(text: string): string {
  return text
    .replace(/请问|帮我|我想|我要|给我|麻烦|一下/g, '')
    .replace(/查(?:一?下|看|询|找)?|查询|看看|还有|剩下|多少|存货|库存|价格|售价|价钱|现在|在哪|在哪里|位置|货架|多少钱|几块钱/g, '')
    .replace(/[，。！？、,.!?呢吗啊吧了的是钱块元\s]/g, '')
    .trim();
}

function alternativesOf(p: Product): string {
  const alts = products.value
    .filter((x) => x.id !== p.id && x.category === p.category && x.stock > 0)
    .slice(0, 2);
  return alts.length ? `同类还有：${alts.map((x) => `${x.name}(${fmtMoney(x.price)})`).join('、')}。` : '';
}

function buildSceneList(scene: SceneDef): string {
  const lines: string[] = [];
  let total = 0;
  scene.items.forEach((it, i) => {
    const p = findProductByName(it.name);
    if (!p) return;
    lines.push(`${i + 1}. ${p.name} ×${it.qty} —— ${fmtMoney(p.price)}，${p.location} 货架`);
    total += p.price * it.qty;
  });
  lines.push(`合计约 ${fmtMoney(total)}。需要确认哪些现货，我可以再帮您看库存～`);
  return `${scene.title}\n${lines.join('\n')}`;
}

export function fallbackAnswer(question: string): AiReply {
  const q = question.trim();

  for (const scene of SCENES) {
    if (scene.keywords.test(q)) {
      const found = scene.items.some((it) => findProductByName(it.name));
      if (found) return { text: buildSceneList(scene), demo: true, source: 'local' };
    }
  }

  const kw = extractProductQuery(q);
  const p = kw ? findProductByName(kw) : undefined;
  if (p) {
    const stockNote = p.stock <= p.safeStock ? `⚠️ 目前库存不多（仅 ${p.stock} 件），建议早点来。` : '';
    return {
      text:
        `「${p.name}」${fmtMoney(p.price)}，在 ${p.location} 货架。\n` +
        `${p.desc}${stockNote ? '\n' + stockNote : ''}` +
        (stockNote ? '\n' + alternativesOf(p) : ''),
      demo: true,
      source: 'local'
    };
  }

  for (const k of KNOWLEDGE) {
    if (k.keywords.some((word) => q.includes(word))) {
      return { text: k.text, demo: true, source: 'local' };
    }
  }

  const promo = activePromotions();
  const hot = topProducts(new Date(Date.now() - 7 * 24 * 3600 * 1000), new Date(), 3)
    .map((t) => t.name)
    .join('、');
  return {
    text:
      `这个我可以帮您问问店主～ 目前店里卖得比较好的是：${hot}。\n` +
      `您可以直接这样问我：「XX 在哪？」「XX 怎么装？」「装修清单」「开学文具清单」「100 元以内工具箱」。` +
      (promo ? `\n\n当前优惠：${promo}` : ''),
    demo: true,
    source: 'local'
  };
}

export interface CommandResult {
  reply: AiReply;
  changed: boolean;
}

export async function detectCommand(command: string): Promise<CommandResult> {
  const text = command.trim();

  if (/报表|周报|本周|热销|滞销|利润|统计/.test(text)) {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
    const top = topProducts(start, end, 3)
      .map((t) => `${t.name}(${t.qty}件)`)
      .join('、');
    const slow = slowMoving(14)
      .slice(0, 3)
      .map((p) => p.name)
      .join('、');
    return {
      changed: false,
      reply: {
        text: `📊 近 7 天热销：${top || '暂无'}。\n🕰️ 近 14 天滞销：${slow || '暂无'}。建议对滞销品做「降价 10% 或捆绑热销品」促销，每周一可查看完整周报。`,
        demo: true,
        source: 'command'
      }
    };
  }

  const priceMatch = text.match(/(?:改|设置|设定|调整|把)(.{1,20}?)(?:的)?(?:价格|售价)(?:改为|改成|调成|设成|定成|到|至|为|成)?(\d+(?:\.\d+)?)\s*(?:元|块)?/);
  if (priceMatch) {
    const p = findProductByName(priceMatch[1].trim());
    if (!p) return { changed: false, reply: { text: `没有找到「${priceMatch[1].trim()}」对应的商品，请确认商品名称。`, demo: true, source: 'command' } };
    const price = Math.round(parseFloat(priceMatch[2]) * 100) / 100;
    if (price <= 0) return { changed: false, reply: { text: '价格需要大于 0。', demo: true, source: 'command' } };
    const oldPrice = p.price;
    await updateProduct(p.id, { price });
    return { changed: true, reply: { text: `✅ 已把「${p.name}」售价从 ${fmtMoney(oldPrice)} 改为 ${fmtMoney(price)}。`, demo: true, source: 'command' } };
  }

  if (/查|库存|还有|多少|价格|售价|在哪|位置/.test(text)) {
    const kw = extractProductQuery(text);
    const p = kw ? findProductByName(kw) : undefined;
    if (p) {
      return {
        changed: false,
        reply: {
          text: `「${p.name}」：库存 ${p.stock} 件（安全库存 ${p.safeStock} 件），售价 ${fmtMoney(p.price)}，在 ${p.location} 货架。` +
            (p.stock <= p.safeStock ? '\n⚠️ 已低于安全库存，建议尽快补货。' : ''),
          demo: true,
          source: 'command'
        }
      };
    }
    return { changed: false, reply: { text: `没有找到「${kw || text}」相关商品。您可以试试：「查胶带库存」「改胶带价格为 5」。`, demo: true, source: 'command' } };
  }

  return {
    changed: false,
    reply: {
      text: '我没听清指令，试试这样说：「查扳手库存」「改胶带价格为 5」「本周热销」。',
      demo: true,
      source: 'command'
    }
  };
}
