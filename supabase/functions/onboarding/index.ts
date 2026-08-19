import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function requestClient(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } } });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const client = requestClient(request);
    if (!client) return json({ error: 'unauthorized' }, 401);
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return json({ error: 'unauthorized' }, 401);
    const { data: existing } = await admin.from('store_members').select('stores(id,name,slug)').eq('user_id', auth.user.id).limit(1).maybeSingle();
    if (existing?.stores) return json({ store: existing.stores, already_onboarded: true });

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const hours = typeof body.hours === 'string' ? body.hours.trim() : '';
    if (!name || name.length > 120) return json({ error: 'invalid_store_name' }, 400);
    const { data: slug, error: slugError } = await admin.rpc('reserve_store_slug', { input_name: name });
    if (slugError || !slug) throw slugError ?? new Error('could_not_reserve_slug');
    const { data: store, error: storeError } = await admin.from('stores').insert({ name, slug, address, phone, hours, welcome: `欢迎来到${name}，请问有什么可以帮您？` }).select('id,name,slug').single();
    if (storeError || !store) throw storeError ?? new Error('could_not_create_store');
    const { error: memberError } = await admin.from('store_members').insert({ store_id: store.id, user_id: auth.user.id, role: 'owner' });
    if (memberError) { await admin.from('stores').delete().eq('id', store.id); throw memberError; }
    const { error: modelError } = await admin.from('ai_model_configs').insert({ store_id: store.id, provider: 'deepseek', model: Deno.env.get('DEFAULT_CHAT_MODEL') ?? 'deepseek-chat', enabled: true, is_default: true });
    if (modelError) console.error('default model setup failed', modelError);
    await admin.from('audit_events').insert({ store_id: store.id, actor_id: auth.user.id, action: 'store.onboarded', entity_type: 'store', entity_id: store.id });
    return json({ store, already_onboarded: false }, 201);
  } catch (error) {
    console.error('onboarding failed', error);
    return json({ error: 'onboarding_unavailable', message: error instanceof Error ? error.message : 'unknown_error' }, 503);
  }
});
