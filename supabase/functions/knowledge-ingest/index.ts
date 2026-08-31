import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { embed } from '../_shared/ai.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function chunkText(text: string): string[] {
  const clean = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  const chunks: string[] = []; const size = 800; const overlap = 120;
  for (let start = 0; start < clean.length; start += size - overlap) { const end = Math.min(clean.length, start + size); const chunk = clean.slice(start, end).trim(); if (chunk) chunks.push(chunk); if (end === clean.length) break; }
  return chunks;
}

async function extractText(bytes: ArrayBuffer, mime: string): Promise<string> {
  if (mime === 'text/plain' || mime === 'text/markdown' || mime === 'text/x-markdown') return new TextDecoder().decode(bytes);
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { const mammoth = await import('https://esm.sh/mammoth@1.8.0'); const result = await mammoth.extractRawText({ arrayBuffer: bytes }); return result.value; }
  // pdfjs-dist depends on a native canvas module that cannot boot in the
  // Supabase Edge Runtime. Keep PDF uploads explicit rather than leaving them
  // stuck in `processing`; Markdown/TXT/DOCX are sufficient for the demo.
  if (mime === 'application/pdf') throw new Error('当前本地 Edge Runtime 暂不支持 PDF 解析，请使用 Markdown、TXT 或 DOCX');
  throw new Error(`Unsupported file type: ${mime}`);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  const client = createClient(url, anon, { global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await client.auth.getUser(); if (!user) return json({ error: 'unauthorized' }, 401, request);
  let documentId: string | null = null;
  try {
    const body = await request.json(); documentId = typeof body.documentId === 'string' ? body.documentId : null; if (!documentId) return json({ error: 'invalid_request' }, 400, request);
    const { data: document, error } = await admin.from('knowledge_documents').select('*').eq('id', documentId).single(); if (error || !document) return json({ error: 'not_found' }, 404, request);
    const { data: member } = await admin.from('store_members').select('role').eq('store_id', document.store_id).eq('user_id', user.id).single(); if (!member || !['owner', 'manager'].includes(member.role)) return json({ error: 'forbidden' }, 403, request);
    await admin.from('knowledge_documents').update({ status: 'processing', error: null }).eq('id', documentId);
    const { data: file, error: fileError } = await admin.storage.from('knowledge').download(document.storage_path); if (fileError || !file) throw new Error(fileError?.message ?? 'File unavailable');
    const text = await extractText(await file.arrayBuffer(), document.mime_type); const chunks = chunkText(text); if (!chunks.length) throw new Error('No readable text found in document');
    await admin.from('knowledge_chunks').delete().eq('document_id', documentId);
    const rows = []; for (let index = 0; index < chunks.length; index += 1) rows.push({ store_id: document.store_id, document_id: documentId, chunk_index: index, content: chunks[index], embedding: `[${(await embed(chunks[index])).join(',')}]` });
    const { error: insertError } = await admin.from('knowledge_chunks').insert(rows); if (insertError) throw insertError;
    await admin.from('knowledge_documents').update({ status: 'draft', error: null }).eq('id', documentId);
    await admin.from('audit_events').insert({ store_id: document.store_id, actor_id: user.id, action: 'knowledge.ingested', entity_type: 'knowledge_document', entity_id: documentId, metadata: { chunks: chunks.length } });
    return json({ status: 'draft', chunks: chunks.length }, 200, request);
  } catch (error) { if (documentId) await admin.from('knowledge_documents').update({ status: 'failed', error: error instanceof Error ? error.message : 'Unknown ingest error' }).eq('id', documentId); return json({ error: 'ingest_failed', message: error instanceof Error ? error.message : 'unknown_error' }, 500, request); }
});
