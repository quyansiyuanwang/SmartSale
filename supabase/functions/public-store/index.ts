import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  try {
    const params = new URL(request.url).searchParams;
    const slug = params.get('slug');
    const token = params.get('token');
    if (!slug || !/^[a-z0-9-]{3,64}$/.test(slug)) return json({ error: 'invalid_store' }, 400, request);
    const { data: store } = await admin.from('stores').select('id,name,slug,address,phone,hours,welcome,service_status,public_enabled,public_access_token,public_access_token_expires_at').eq('slug', slug).single();
    if (!store) return json({ error: 'store_not_found' }, 404, request);
    if (!token || token !== store.public_access_token) return json({ error: 'invalid_token' }, 403, request);
    if (new Date(store.public_access_token_expires_at).getTime() <= Date.now()) return json({ error: 'token_expired' }, 403, request);
    if (store.service_status !== 'active' || !store.public_enabled) return json({ error: 'store_suspended' }, 423, request);
    const [{ data: products }, { data: promotions }] = await Promise.all([
      admin.from('products').select('name,category,price,stock,location,description').eq('store_id', store.id).eq('is_published', true).limit(200),
      admin.from('promotions').select('title,detail').eq('store_id', store.id).eq('active', true).limit(50)
    ]);
    const publicStore = {
      id: store.id,
      name: store.name,
      slug: store.slug,
      address: store.address,
      phone: store.phone,
      hours: store.hours,
      welcome: store.welcome,
      service_status: store.service_status,
      public_enabled: store.public_enabled
    };
    return json({ store: publicStore, products: products ?? [], promotions: promotions ?? [] }, 200, request);
  } catch (error) {
    return json({ error: 'public_store_unavailable', message: error instanceof Error ? error.message : 'unknown' }, 503, request);
  }
});
