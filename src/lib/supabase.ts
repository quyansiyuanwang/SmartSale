import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getPlatformConfig } from './platform-config';

export let hasSupabaseConfig = false;
export let isDemoMode = true;
export let supabase: SupabaseClient | null = null;

export function configureSupabase(): void {
  const config = getPlatformConfig();
  hasSupabaseConfig = config.isConfigured;
  isDemoMode = config.isDemoMode;
  supabase = hasSupabaseConfig ? createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
}

configureSupabase();
