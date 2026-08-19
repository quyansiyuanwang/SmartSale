import { ref } from 'vue';
import { loadJSON, saveJSON } from './storage.service';

export interface RuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  aiProvider: 'deepseek' | 'openai-compatible';
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
}

const KEY = 'ss.runtimeConfig';
export const runtimeConfig = ref<RuntimeConfig>({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  aiProvider: 'deepseek',
  aiBaseUrl: 'https://api.deepseek.com',
  aiModel: 'deepseek-chat',
  aiApiKey: ''
});

export async function loadRuntimeConfig(): Promise<void> {
  const saved = await loadJSON<Partial<RuntimeConfig>>(KEY, {});
  runtimeConfig.value = { ...runtimeConfig.value, ...saved };
}

export async function saveRuntimeConfig(patch: Partial<RuntimeConfig>): Promise<RuntimeConfig> {
  runtimeConfig.value = { ...runtimeConfig.value, ...patch };
  await saveJSON(KEY, runtimeConfig.value);
  return runtimeConfig.value;
}

export async function clearRuntimeConfig(): Promise<void> {
  runtimeConfig.value = { ...runtimeConfig.value, supabaseUrl: '', supabaseAnonKey: '', aiApiKey: '' };
  await saveJSON(KEY, runtimeConfig.value);
}
