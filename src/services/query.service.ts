import { queries, persistQueries } from './data';
import { isDemoMode, supabase } from '@/lib/supabase';
import { CustomerQuery } from '@/types';
import { uid, nowISO } from './storage.service';

export async function addQuery(content: string, answer: string, demo: boolean): Promise<CustomerQuery> {
  const q: CustomerQuery = { id: uid('q'), content, answer, demo, createdAt: nowISO(), status: 'new', followedAt: null };
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

export async function markQueriesFollowed(ids: string[]): Promise<void> {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return;
  const followedAt = nowISO();
  if (!isDemoMode) {
    if (!supabase) throw new Error('平台服务尚未配置');
    const { error } = await supabase.from('customer_queries').update({ status: 'followed', followed_at: followedAt }).in('id', uniqueIds);
    if (error) throw error;
  }
  queries.value.forEach((query) => {
    if (uniqueIds.includes(query.id)) {
      query.status = 'followed';
      query.followedAt = followedAt;
    }
  });
  if (isDemoMode) await persistQueries();
}
