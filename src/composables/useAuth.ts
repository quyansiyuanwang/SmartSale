import { computed, ref } from 'vue';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type StoreRole = 'owner' | 'manager' | 'staff';
export interface CurrentStore { id: string; slug: string; name: string; role: StoreRole; }
const session = ref<Session | null>(null); const user = computed<User | null>(() => session.value?.user ?? null);
const currentStore = ref<CurrentStore | null>(null); const ready = ref(false);

export function useAuth() {
  async function initializeAuth() {
    if (!supabase) { ready.value = true; return; }
    const { data } = await supabase.auth.getSession(); session.value = data.session;
    supabase.auth.onAuthStateChange((_event, nextSession) => { session.value = nextSession; if (!nextSession) currentStore.value = null; });
    if (session.value) await loadCurrentStore(); ready.value = true;
  }
  async function loadCurrentStore() {
    if (!supabase || !user.value) return;
    const { data, error } = await supabase.from('store_members').select('role, stores(id,slug,name)').eq('user_id', user.value.id).limit(1).maybeSingle();
    if (error) throw error; const store = data?.stores as unknown as { id: string; slug: string; name: string } | null;
    currentStore.value = store ? { ...store, role: data!.role as StoreRole } : null;
  }
  async function signIn(email: string, password: string) { if (!supabase) throw new Error('Supabase 尚未配置'); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; await loadCurrentStore(); }
  async function signOut() { if (supabase) { const { error } = await supabase.auth.signOut(); if (error) throw error; } currentStore.value = null; }
  return { session, user, currentStore, ready, initializeAuth, loadCurrentStore, signIn, signOut, isOwner: computed(() => currentStore.value?.role === 'owner'), canManage: computed(() => ['owner', 'manager'].includes(currentStore.value?.role ?? '')) };
}
