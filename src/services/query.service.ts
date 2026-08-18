import { queries, persistQueries } from './data';
import { isDemoMode } from '@/lib/supabase';
import { CustomerQuery } from '@/types';
import { uid, nowISO } from './storage.service';

export async function addQuery(content: string, answer: string, demo: boolean): Promise<CustomerQuery> {
  const q: CustomerQuery = { id: uid('q'), content, answer, demo, createdAt: nowISO() };
  queries.value.unshift(q);
  if (isDemoMode) await persistQueries();
  return q;
}

export function listQueries(n = 50): CustomerQuery[] {
  return queries.value.slice(0, n);
}

export async function clearQueries(): Promise<void> {
  queries.value = [];
  await persistQueries();
}
