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
const DEMO_PUBLIC_TOKEN_KEY = 'ss.demoPublicAccessToken';
const validSlug = /^[a-z0-9-]{3,64}$/;
const validPublicToken = /^[A-Za-z0-9_-]{16,128}$/;

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

export function publicStoreUrl(slug: string, token?: string): string {
  const url = `${getPlatformConfig().publicAppUrl}/s/${encodeURIComponent(slug)}`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

/** Generates the local demo token once; cloud tokens come from the store row. */
export function demoPublicAccessToken(): string {
  if (typeof window === 'undefined') return 'demo-public-token-2026';
  const existing = window.localStorage.getItem(DEMO_PUBLIC_TOKEN_KEY);
  if (existing && validPublicToken.test(existing)) return existing;
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  window.localStorage.setItem(DEMO_PUBLIC_TOKEN_KEY, token);
  return token;
}

export function isValidPublicAccessToken(token: unknown): token is string {
  return typeof token === 'string' && validPublicToken.test(token);
}

export function rememberPublicStore(slug: string): void {
  if (typeof window !== 'undefined' && validSlug.test(slug)) window.localStorage.setItem(LAST_PUBLIC_STORE_KEY, slug);
}

export function lastPublicStoreSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const slug = window.localStorage.getItem(LAST_PUBLIC_STORE_KEY);
  return slug && validSlug.test(slug) ? slug : null;
}
