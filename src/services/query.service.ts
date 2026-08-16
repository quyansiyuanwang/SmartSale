import { queries, persistQueries } from './data';
import { CustomerQuery } from '@/types';
import { uid, nowISO } from './storage.service';

export async function addQuery(content: string, answer: string, demo: boolean): Promise<CustomerQuery> {
  const q: CustomerQuery = { id: uid('q'), content, answer, demo, createdAt: nowISO() };
  queries.value.unshift(q);
  await persistQueries();
  return q;
}

export function listQueries(n = 50): CustomerQuery[] {
  return queries.value.slice(0, n);
}

export async function clearQueries(): Promise<void> {
  queries.value = [];
  await persistQueries();
}
