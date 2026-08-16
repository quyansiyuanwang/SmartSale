import { storeProfile, llmConfig, persistProfile, persistLlm } from './data';
import { StoreProfile, LlmConfig } from '@/types';

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
  return !!llmConfig.value.apiKey.trim();
}
