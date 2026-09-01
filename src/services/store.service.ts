import { storeProfile, llmConfig, persistProfile, persistLlm } from './data';
import { StoreProfile, LlmConfig } from '@/types';
import { isDemoMode, supabase } from '@/lib/supabase';
import { useAuth } from '@/composables/useAuth';
import { KEYS, loadJSON, saveJSON } from './storage.service';
import { demoPublicAccessToken } from '@/lib/platform-config';
import { validateStoreProfile } from './store-profile-validation';

export interface PublicServiceSettings { serviceStatus: 'active' | 'suspended'; publicEnabled: boolean; }

const DEFAULT_PUBLIC_SERVICE: PublicServiceSettings = { serviceStatus: 'active', publicEnabled: true };
export const PUBLIC_ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const TOKEN_RENEW_BEFORE_MS = 60 * 1000;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let visibilityListenerRegistered = false;

export interface PublicAccessTokenDetails {
  token: string;
  expiresAt: string;
}

function createToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function nextExpiry(): string { return new Date(Date.now() + PUBLIC_ACCESS_TOKEN_TTL_MS).toISOString(); }

function notifyTokenChange(details: PublicAccessTokenDetails): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('public-access-token-changed', { detail: details }));
}

async function demoTokenDetails(): Promise<PublicAccessTokenDetails> {
  const token = await loadJSON<string>(KEYS.publicAccessToken, '');
  const expiresAt = await loadJSON<string>(KEYS.publicAccessTokenExpiresAt, '');
  if (token && expiresAt && Date.parse(expiresAt) > Date.now() + TOKEN_RENEW_BEFORE_MS) return { token, expiresAt };
  const details = { token: token || demoPublicAccessToken(), expiresAt: nextExpiry() };
  await Promise.all([saveJSON(KEYS.publicAccessToken, details.token), saveJSON(KEYS.publicAccessTokenExpiresAt, details.expiresAt)]);
  return details;
}

async function cloudTokenDetails(): Promise<PublicAccessTokenDetails> {
  const storeId = useAuth().currentStore.value?.id;
  if (!supabase || !storeId) throw new Error('未选择门店');
  const { data, error } = await supabase.from('stores').select('public_access_token,public_access_token_expires_at').eq('id', storeId).single();
  if (error) throw error;
  if (!data?.public_access_token || !data.public_access_token_expires_at) throw new Error('门店访问令牌未生成，请重试');
  return { token: data.public_access_token, expiresAt: data.public_access_token_expires_at };
}

export async function loadPublicAccessTokenDetails(): Promise<PublicAccessTokenDetails> {
  const details = isDemoMode ? await demoTokenDetails() : await cloudTokenDetails();
  if (Date.parse(details.expiresAt) <= Date.now() + TOKEN_RENEW_BEFORE_MS) return rotatePublicAccessTokenDetails();
  return details;
}

export async function loadPublicAccessToken(): Promise<string> {
  return (await loadPublicAccessTokenDetails()).token;
}

export async function rotatePublicAccessTokenDetails(): Promise<PublicAccessTokenDetails> {
  const details = { token: createToken(), expiresAt: nextExpiry() };
  if (isDemoMode) {
    await Promise.all([saveJSON(KEYS.publicAccessToken, details.token), saveJSON(KEYS.publicAccessTokenExpiresAt, details.expiresAt)]);
    notifyTokenChange(details);
    return details;
  }
  const storeId = useAuth().currentStore.value?.id;
  if (!supabase || !storeId) throw new Error('未选择门店');
  const { error } = await supabase.from('stores').update({ public_access_token: details.token, public_access_token_expires_at: details.expiresAt }).eq('id', storeId);
  if (error) throw error;
  notifyTokenChange(details);
  return details;
}

export async function rotatePublicAccessToken(): Promise<string> {
  return (await rotatePublicAccessTokenDetails()).token;
}

function scheduleTokenRefresh(details: PublicAccessTokenDetails): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  const waitMs = Math.max(1_000, Date.parse(details.expiresAt) - Date.now() - TOKEN_RENEW_BEFORE_MS);
  refreshTimer = setTimeout(() => {
    void loadPublicAccessTokenDetails().then(scheduleTokenRefresh).catch(() => undefined);
  }, waitMs);
}

/** Keeps the on-screen customer QR fresh while the merchant application is running. */
export function startPublicAccessTokenAutoRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  void loadPublicAccessTokenDetails().then(scheduleTokenRefresh).catch(() => undefined);
  if (!visibilityListenerRegistered && typeof document !== 'undefined') {
    visibilityListenerRegistered = true;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void loadPublicAccessTokenDetails().then(scheduleTokenRefresh).catch(() => undefined);
    });
  }
}

export async function saveProfile(patch: Partial<StoreProfile>): Promise<StoreProfile> {
  const validation = validateStoreProfile({ ...storeProfile.value, ...patch });
  if (!validation.valid) throw new Error(validation.errors[0]);
  storeProfile.value = validation.profile;
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
