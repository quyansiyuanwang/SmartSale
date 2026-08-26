export type AppMode = 'demo-local' | 'cloud' | 'misconfigured';

export interface PlatformConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  publicAppUrl: string;
  isConfigured: boolean;
  isDemoMode: boolean;
  mode: AppMode;
  demoAiEnabled: boolean;
}

function trimSlash(value: string): string { return value.replace(/\/+$/, ''); }
const LAST_PUBLIC_STORE_KEY = 'ss.lastPublicStoreSlug';
const validSlug = /^[a-z0-9-]{3,64}$/;

export function getPlatformConfig(): PlatformConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  const configuredPublicUrl = import.meta.env.VITE_APP_PUBLIC_BASE_URL?.trim();
  const publicAppUrl = trimSlash(configuredPublicUrl || (typeof window === 'undefined' ? '' : window.location.origin));
  const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
  const isDemoMode = import.meta.env.MODE === 'test' || import.meta.env.VITE_DEMO_MODE === 'true';
  const mode: AppMode = isDemoMode ? 'demo-local' : isConfigured ? 'cloud' : 'misconfigured';
  return {
    supabaseUrl,
    supabaseAnonKey,
    publicAppUrl,
    isConfigured,
    isDemoMode,
    mode,
    demoAiEnabled: isDemoMode && import.meta.env.VITE_DEMO_AI_ENABLED === 'true'
  };
}

export function publicStoreUrl(slug: string): string {
  return `${getPlatformConfig().publicAppUrl}/s/${encodeURIComponent(slug)}`;
}

export function rememberPublicStore(slug: string): void {
  if (typeof window !== 'undefined' && validSlug.test(slug)) window.localStorage.setItem(LAST_PUBLIC_STORE_KEY, slug);
}

export function lastPublicStoreSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const slug = window.localStorage.getItem(LAST_PUBLIC_STORE_KEY);
  return slug && validSlug.test(slug) ? slug : null;
}
