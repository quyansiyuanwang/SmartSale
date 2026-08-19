import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const hasSupabaseConfig = Boolean(url && anonKey);
// A local checkout without Supabase credentials must remain usable for development.
// Production is selected by providing Supabase credentials and setting VITE_DEMO_MODE=false.
export const isDemoMode = import.meta.env.VITE_DEMO_MODE !== 'false' || !hasSupabaseConfig || import.meta.env.MODE === 'test';
export const supabase = hasSupabaseConfig
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
