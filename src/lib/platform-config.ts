export interface PlatformConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  publicAppUrl: string;
  isConfigured: boolean;
  isDemoMode: boolean;
}

function trimSlash(value: string): string { return value.replace(/\/+$/, ''); }

export function getPlatformConfig(): PlatformConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  const configuredPublicUrl = import.meta.env.VITE_APP_PUBLIC_BASE_URL?.trim();
  const publicAppUrl = trimSlash(configuredPublicUrl || (typeof window === 'undefined' ? '' : window.location.origin));
  const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
  return {
    supabaseUrl,
    supabaseAnonKey,
    publicAppUrl,
    isConfigured,
    isDemoMode: import.meta.env.MODE === 'test' || import.meta.env.VITE_DEMO_MODE === 'true' || !isConfigured
  };
}

export function publicStoreUrl(slug: string): string {
  return `${getPlatformConfig().publicAppUrl}/s/${encodeURIComponent(slug)}`;
}
