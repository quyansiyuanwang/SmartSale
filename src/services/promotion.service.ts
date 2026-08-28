import { promotions, persistPromotions } from './data';
import { isDemoMode, supabase } from '@/lib/supabase';
import { useAuth } from '@/composables/useAuth';
import type { Promotion, PromotionInput } from '@/types';
import { nowISO, uid } from './storage.service';

export async function createPromotion(input: PromotionInput): Promise<Promotion> {
  const title = input.title.trim();
  const detail = input.detail.trim();
  if (!title || !detail) throw new Error('促销标题和说明不能为空');
  const active = input.active ?? true;

  if (isDemoMode) {
    const promotion: Promotion = { id: uid('promo'), title, detail, active, createdAt: nowISO() };
    promotions.value.unshift(promotion);
    await persistPromotions();
    return promotion;
  }

  const storeId = useAuth().currentStore.value?.id;
  if (!supabase || !storeId) throw new Error('未选择门店');
  const { data, error } = await supabase.from('promotions').insert({ store_id: storeId, title, detail, active }).select().single();
  if (error || !data) throw error ?? new Error('促销创建失败');
  const promotion: Promotion = { id: data.id, title: data.title, detail: data.detail, active: data.active, createdAt: data.created_at };
  promotions.value.unshift(promotion);
  return promotion;
}

export async function setPromotionActive(id: string, active: boolean): Promise<Promotion | undefined> {
  const promotion = promotions.value.find((p) => p.id === id);
  if (!promotion) return undefined;
  promotion.active = active;

  if (isDemoMode) {
    await persistPromotions();
    return promotion;
  }
  const storeId = useAuth().currentStore.value?.id;
  if (!supabase || !storeId) throw new Error('未选择门店');
  const { error } = await supabase.from('promotions').update({ active }).eq('id', id);
  if (error) throw error;
  return promotion;
}

export async function deletePromotion(id: string): Promise<void> {
  promotions.value = promotions.value.filter((p) => p.id !== id);
  if (isDemoMode) {
    await persistPromotions();
    return;
  }
  const storeId = useAuth().currentStore.value?.id;
  if (!supabase || !storeId) throw new Error('未选择门店');
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) throw error;
}
