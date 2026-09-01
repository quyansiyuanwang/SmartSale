import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const hoursPattern = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/;
const mobilePhonePattern = /^1[3-9]\d{9}$/;
const landlinePhonePattern = /^0\d{2,3}-?\d{7,8}$/;

function validHours(hours: string): boolean {
  const match = hoursPattern.exec(hours);
  if (!match) return false;
  const opening = Number(match[1]) * 60 + Number(match[2]);
  const closing = Number(match[3]) * 60 + Number(match[4]);
  return Number(match[1]) < 24 && Number(match[2]) < 60 && Number(match[3]) < 24 && Number(match[4]) < 60 && closing > opening;
}

function requestClient(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } } });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, request);
  try {
    const client = requestClient(request);
    if (!client) return json({ error: 'unauthorized' }, 401, request);
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return json({ error: 'unauthorized' }, 401, request);
    const { data: existing } = await admin.from('store_members').select('stores(id,name,slug)').eq('user_id', auth.user.id).limit(1).maybeSingle();
    if (existing?.stores) return json({ store: existing.stores, already_onboarded: true }, 200, request);

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const hours = typeof body.hours === 'string' ? body.hours.trim() : '';
    if (name.length < 2 || name.length > 120) return json({ error: 'invalid_store_name', message: '门店名称需为 2-120 个字符' }, 400, request);
    if (address.length < 2 || address.length > 200) return json({ error: 'invalid_store_address', message: '门店地址需为 2-200 个字符' }, 400, request);
    if (phone && !mobilePhonePattern.test(phone) && !landlinePhonePattern.test(phone)) return json({ error: 'invalid_store_phone', message: '请输入有效的手机或座机号码' }, 400, request);
    if (!validHours(hours)) return json({ error: 'invalid_store_hours', message: '请选择有效的营业时��，结束时间需晚于开始时间' }, 400, request);
    const { data: slug, error: slugError } = await admin.rpc('reserve_store_slug', { input_name: name });
    if (slugError || !slug) throw slugError ?? new Error('could_not_reserve_slug');
    const { data: store, error: storeError } = await admin.from('stores').insert({ name, slug, address, phone, hours, welcome: `欢迎来到${name}，请问有什么可以帮您？` }).select('id,name,slug').single();
    if (storeError || !store) throw storeError ?? new Error('could_not_create_store');
    const { error: memberError } = await admin.from('store_members').insert({ store_id: store.id, user_id: auth.user.id, role: 'owner' });
    if (memberError) { await admin.from('stores').delete().eq('id', store.id); throw memberError; }
    const { error: modelError } = await admin.from('ai_model_configs').insert({ store_id: store.id, provider: 'deepseek', model: Deno.env.get('DEFAULT_CHAT_MODEL') ?? 'deepseek-chat', enabled: true, is_default: true });
    if (modelError) console.error('default model setup failed', modelError);
    await admin.from('audit_events').insert({ store_id: store.id, actor_id: auth.user.id, action: 'store.onboarded', entity_type: 'store', entity_id: store.id });
    return json({ store, already_onboarded: false }, 201, request);
  } catch (error) {
    console.error('onboarding failed', error);
    return json({ error: 'onboarding_unavailable', message: error instanceof Error ? error.message : 'unknown_error' }, 503, request);
  }
});
