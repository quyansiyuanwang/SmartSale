import { storeProfile, llmConfig, persistProfile, persistLlm } from './data';
import { StoreProfile, LlmConfig } from '@/types';
import { isDemoMode, supabase } from '@/lib/supabase';
import { useAuth } from '@/composables/useAuth';
import { KEYS, loadJSON, saveJSON } from './storage.service';
import { demoPublicAccessToken } from '@/lib/platform-config';

export interface PublicServiceSettings { serviceStatus: 'active' | 'suspended'; publicEnabled: boolean; }

const DEFAULT_PUBLIC_SERVICE: PublicServiceSettings = { serviceStatus: 'active', publicEnabled: true };

export async function loadPublicAccessToken(): Promise<string> {
  if (isDemoMode) {
    const stored = await loadJSON<string>(KEYS.publicAccessToken, '');
    if (stored) return stored;
    const generated = demoPublicAccessToken();
    await saveJSON(KEYS.publicAccessToken, generated);
    return generated;
  }
  const storeId = useAuth().currentStore.value?.id;
  if (!supabase || !storeId) throw new Error('未选择门店');
  const { data, error } = await supabase.from('stores').select('public_access_token').eq('id', storeId).single();
  if (error) throw error;
  if (!data?.public_access_token) throw new Error('门店访问令牌未生成，请重试');
  return data.public_access_token;
}

export async function rotatePublicAccessToken(): Promise<string> {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (isDemoMode) {
    await saveJSON(KEYS.publicAccessToken, token);
    return token;
  }
  const storeId = useAuth().currentStore.value?.id;
  if (!supabase || !storeId) throw new Error('未选择门店');
  const { error } = await supabase.from('stores').update({ public_access_token: token }).eq('id', storeId);
  if (error) throw error;
  return token;
}

export async function saveProfile(patch: Partial<StoreProfile>): Promise<StoreProfile> {
  storeProfile.value = { ...storeProfile.value, ...patch };
  await persistProfile();
  return storeProfile.value;
}

export async function saveLlmConfig(patch: Partial<LlmConfig>): Promise<LlmConfig> {
  llmConfig.value = { ...llmConfig.value, ...patch };
  await persistLlm();
  return llmConfig.value;
}

export function hasApiKey(): boolean {
  return !isDemoMode && !!llmConfig.value.provider;
}

export async function loadPublicServiceSettings(): Promise<PublicServiceSettings> {
  if (isDemoMode) return loadJSON<PublicServiceSettings>(KEYS.publicService, { ...DEFAULT_PUBLIC_SERVICE });
  const storeId = useAuth().currentStore.value?.id; if (!supabase || !storeId) throw new Error('未选择门店');
  const { data, error } = await supabase.from('stores').select('service_status,public_enabled').eq('id', storeId).single(); if (error) throw error;
  return { serviceStatus: data.service_status, publicEnabled: data.public_enabled };
}

export async function savePublicServiceSettings(settings: PublicServiceSettings): Promise<void> {
  if (isDemoMode) { await saveJSON(KEYS.publicService, settings); return; }
  const storeId = useAuth().currentStore.value?.id; if (!supabase || !storeId) throw new Error('未选择门店');
  const { error } = await supabase.from('stores').update({ service_status: settings.serviceStatus, public_enabled: settings.publicEnabled }).eq('id', storeId); if (error) throw error;
}
