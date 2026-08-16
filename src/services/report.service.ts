import { products, sales } from './data';
import { Product, SaleRecord, RangeSummary, TopProduct, WeeklyReport } from '@/types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function inRange(s: SaleRecord, from: Date, to: Date): boolean {
  const t = new Date(s.time).getTime();
  return t >= from.getTime() && t < to.getTime();
}

export function summaryIn(from: Date, to: Date): RangeSummary {
  let count = 0;
  let revenue = 0;
  let profit = 0;
  for (const s of sales.value) {
    if (!inRange(s, from, to)) continue;
    count += s.qty;
    revenue += s.total;
    profit += (s.unitPrice - s.cost) * s.qty;
  }
  return { count, revenue: round2(revenue), profit: round2(profit) };
}

export function todaySummary(): RangeSummary {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  return summaryIn(from, new Date(from.getTime() + 24 * 3600 * 1000));
}

export function mondayOf(d: Date): Date {
  const x = new Date(d);
  const offset = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function weeklyRange(reference = new Date()): { from: Date; to: Date } {
  const from = mondayOf(reference);
  const to = new Date(from.getTime() + 7 * 24 * 3600 * 1000);
  return { from, to };
}

export function topProducts(from: Date, to: Date, n = 5): TopProduct[] {
  const map = new Map<string, TopProduct>();
  for (const s of sales.value) {
    if (!inRange(s, from, to)) continue;
    const t =
      map.get(s.productId) ??
      { productId: s.productId, name: s.productName, qty: 0, amount: 0, profit: 0 };
    t.qty += s.qty;
    t.amount += s.total;
    t.profit += (s.unitPrice - s.cost) * s.qty;
    map.set(s.productId, t);
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, n);
}

export function slowMoving(days = 14): Product[] {
  const from = new Date(Date.now() - days * 24 * 3600 * 1000);
  const soldIds = new Set(
    sales.value.filter((s) => new Date(s.time).getTime() >= from.getTime()).map((s) => s.productId)
  );
  return products.value
    .filter((p) => p.stock > 0 && !soldIds.has(p.id))
    .sort((a, b) => a.stock - b.stock);
}

export function lowStock(): Product[] {
  return products.value
    .filter((p) => p.stock <= p.safeStock)
    .sort((a, b) => a.stock / a.safeStock - b.stock / b.safeStock);
}

export function weeklyReport(reference = new Date()): WeeklyReport {
  const { from, to } = weeklyRange(reference);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    summary: summaryIn(from, to),
    top: topProducts(from, to, 5),
    slow: slowMoving(14)
  };
}

export function fmtMoney(n: number): string {
  return `¥${n.toFixed(2)}`;
}
