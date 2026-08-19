import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { embed, streamChat, type ModelConfig } from '../_shared/ai.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const maxQuestionLength = 1200;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const startedAt = Date.now();
  try {
    const { slug, question, messages = [] } = await request.json();
    if (typeof slug !== 'string' || !/^[a-z0-9-]{3,64}$/.test(slug) || typeof question !== 'string' || !question.trim() || question.length > maxQuestionLength || !Array.isArray(messages)) return json({ error: 'invalid_request' }, 400);
    const { data: store, error: storeError } = await admin.from('stores').select('id,name,address,hours,welcome,default_model_id,service_status,public_enabled').eq('slug', slug).single();
    if (storeError || !store) return json({ error: 'store_not_found' }, 404);
    if (store.service_status !== 'active' || !store.public_enabled) return json({ error: 'store_suspended' }, 423);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await admin.from('rate_limit_events').select('*', { count: 'exact', head: true }).eq('store_id', store.id).eq('key', ip).eq('endpoint', 'ai-chat').gte('created_at', since);
    if ((count ?? 0) >= 20) return json({ error: 'rate_limited', retry_after: 60 }, 429);
    await admin.from('rate_limit_events').insert({ store_id: store.id, key: ip, endpoint: 'ai-chat' });
    const [{ data: products }, { data: promotions }, { data: config }] = await Promise.all([
      admin.from('products').select('name,category,price,stock,location,description').eq('store_id', store.id).eq('is_published', true).limit(200),
      admin.from('promotions').select('title,detail').eq('store_id', store.id).eq('active', true),
      admin.from('ai_model_configs').select('provider,model,base_url').eq('store_id', store.id).eq('enabled', true).order('is_default', { ascending: false }).limit(1).single(),
    ]);
    if (!config) return json({ error: 'ai_not_configured' }, 503);
    let chunks: Array<{ content: string; document_id: string }> = [];
    try { const vector = await embed(question); const { data } = await admin.rpc('match_knowledge_chunks', { target_store_id: store.id, query_embedding: `[${vector.join(',')}]`, match_count: 6 }); chunks = data ?? []; } catch (error) { console.error('knowledge retrieval unavailable', error); }
    const context = JSON.stringify({ catalog: products ?? [], promotions: promotions ?? [], knowledge: chunks.map((chunk) => chunk.content) });
    const system = `You are a helpful retail assistant for ${store.name}. Use only the supplied store context. Never invent product price, stock, location, promotion, or policy. Answer in concise Chinese. Context: ${context}`;
    const upstream = await streamChat(config as ModelConfig, [{ role: 'system', content: system }, ...messages.slice(-8), { role: 'user', content: question.trim() }]);
    const sourceDocuments = chunks.map((chunk) => chunk.document_id);
    const headers = new Headers({ ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Source-Documents': sourceDocuments.join(',') });
    const reader = upstream.body!.getReader(); const decoder = new TextDecoder(); let answer = '';
    const body = new ReadableStream({ async pull(controller) { const { value, done } = await reader.read(); if (done) { controller.close(); await admin.from('customer_queries').insert({ store_id: store.id, content: question.trim(), answer, source_document_ids: sourceDocuments, provider: config.provider, model: config.model, latency_ms: Date.now() - startedAt }); return; } const raw = decoder.decode(value, { stream: true }); for (const line of raw.split('\n')) { if (!line.startsWith('data:')) continue; const data = line.slice(5).trim(); if (data === '[DONE]') continue; try { const delta = JSON.parse(data)?.choices?.[0]?.delta?.content; if (typeof delta === 'string') answer += delta; } catch { /* provider SSE heartbeats */ } } controller.enqueue(value); }, cancel() { reader.cancel(); } });
    return new Response(body, { headers });
  } catch (error) { console.error(error); return json({ error: 'ai_unavailable', message: error instanceof Error ? error.message : 'unknown_error' }, 503); }
});
