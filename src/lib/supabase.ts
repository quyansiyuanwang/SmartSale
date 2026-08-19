import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export let hasSupabaseConfig = false;
export let isDemoMode = true;
export let supabase: SupabaseClient | null = null;

export function configureSupabase(url?: string, anonKey?: string): void {
  const configuredUrl = url?.trim() || import.meta.env.VITE_SUPABASE_URL?.trim() || '';
  const configuredKey = anonKey?.trim() || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';
  hasSupabaseConfig = Boolean(configuredUrl && configuredKey);
  isDemoMode = import.meta.env.MODE === 'test' || import.meta.env.VITE_DEMO_MODE === 'true' || !hasSupabaseConfig;
  supabase = hasSupabaseConfig ? createClient(configuredUrl, configuredKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
}

configureSupabase();
