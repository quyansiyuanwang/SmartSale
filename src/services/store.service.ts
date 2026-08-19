import { storeProfile, llmConfig, persistProfile, persistLlm } from './data';
import { StoreProfile, LlmConfig } from '@/types';
import { isDemoMode, supabase } from '@/lib/supabase';
import { useAuth } from '@/composables/useAuth';

export interface PublicServiceSettings { serviceStatus: 'active' | 'suspended'; publicEnabled: boolean; }

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
  if (isDemoMode) return { serviceStatus: 'active', publicEnabled: true };
  const storeId = useAuth().currentStore.value?.id; if (!supabase || !storeId) throw new Error('未选择门店');
  const { data, error } = await supabase.from('stores').select('service_status,public_enabled').eq('id', storeId).single(); if (error) throw error;
  return { serviceStatus: data.service_status, publicEnabled: data.public_enabled };
}

export async function savePublicServiceSettings(settings: PublicServiceSettings): Promise<void> {
  if (isDemoMode) return;
  const storeId = useAuth().currentStore.value?.id; if (!supabase || !storeId) throw new Error('未选择门店');
  const { error } = await supabase.from('stores').update({ service_status: settings.serviceStatus, public_enabled: settings.publicEnabled }).eq('id', storeId); if (error) throw error;
}
