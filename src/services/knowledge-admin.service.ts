import { supabase } from '@/lib/supabase';
import { useAuth } from '@/composables/useAuth';
import { uid } from './storage.service';
import type { KnowledgeDocument, KnowledgeDocumentStatus } from '@/types';

export const KNOWLEDGE_ACCEPT = '.pdf,.docx,.txt,.md,.markdown';
export const KNOWLEDGE_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = /\.(pdf|docx|txt|md|markdown)$/i;
const DOC_COLUMNS = 'id,file_name,storage_path,mime_type,size_bytes,status,error,created_at';

/** Storage object keys are kept ASCII-only; the original name remains in file_name. */
export function storageSafeFileName(fileName: string): string {
  const match = fileName.match(/\.([a-z0-9]+)$/i);
  const extension = match ? `.${match[1].toLowerCase()}` : '';
  const base = fileName
    .slice(0, match ? -match[0].length : undefined)
    .normalize('NFKD')
    .split('')
    .filter((character) => character.charCodeAt(0) <= 127)
    .join('')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '')
    .slice(0, 80);
  return `${base || 'document'}${extension}`;
}

function requireClient(): NonNullable<typeof supabase> {
  if (!supabase) throw new Error('平台服务尚未配置');
  return supabase;
}

function requireStoreId(): string {
  const store = useAuth().currentStore.value;
  if (!store) throw new Error('请先登录并创建门店');
  return store.id;
}

function docFromRow(row: Record<string, unknown>): KnowledgeDocument {
  return {
    id: String(row.id),
    fileName: String(row.file_name ?? ''),
    storagePath: String(row.storage_path ?? ''),
    mimeType: String(row.mime_type ?? ''),
    sizeBytes: Number(row.size_bytes ?? 0),
    status: (row.status as KnowledgeDocumentStatus) ?? 'processing',
    error: (row.error as string | null) ?? null,
    createdAt: String(row.created_at ?? '')
  };
}

async function reloadDocument(id: string): Promise<KnowledgeDocument> {
  const { data, error } = await requireClient().from('knowledge_documents').select(DOC_COLUMNS).eq('id', id).single();
  if (error || !data) throw new Error('读取文档状态失败，请刷新页面');
  return docFromRow(data as Record<string, unknown>);
}

export function validateKnowledgeFile(file: File): void {
  if (!ALLOWED_EXTENSIONS.test(file.name)) throw new Error('仅支持 PDF、DOCX、TXT 或 Markdown 文件');
  if (file.size <= 0) throw new Error('文件内容为空，请检查文件');
  if (file.size > KNOWLEDGE_MAX_BYTES) throw new Error('文件超过 10 MB 上限，请先拆分或压缩');
}

export async function listKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  const { data, error } = await requireClient().from('knowledge_documents').select(DOC_COLUMNS).order('created_at', { ascending: false });
  if (error) throw new Error('读取知识库失败，请重试');
  return ((data ?? []) as Record<string, unknown>[]).map(docFromRow);
}

export async function uploadKnowledgeDocument(file: File): Promise<KnowledgeDocument> {
  validateKnowledgeFile(file);
  const client = requireClient();
  const storeId = requireStoreId();
  const safeName = storageSafeFileName(file.name);
  const path = `${storeId}/${Date.now()}-${uid('knowledge')}-${safeName}`;
  const { error: uploadError } = await client.storage.from('knowledge').upload(path, file, { contentType: file.type || 'application/octet-stream' });
  if (uploadError) throw new Error('文件上传失败，请重试');
  const { data, error } = await client
    .from('knowledge_documents')
    .insert({ store_id: storeId, file_name: file.name, storage_path: path, mime_type: file.type || 'application/octet-stream', size_bytes: file.size })
    .select(DOC_COLUMNS)
    .single();
  if (error || !data) {
    await client.storage.from('knowledge').remove([path]);
    throw new Error('知识库记录创建失败，请重试');
  }
  const document = docFromRow(data as Record<string, unknown>);
  try {
    await runKnowledgeIngest(document.id);
    return await reloadDocument(document.id);
  } catch (error) {
    // 文件与记录都已保存，解析失败时保留状态为 failed，由商家决定重试或删除。
    return await reloadDocument(document.id).catch(() => ({ ...document, status: 'failed' as const, error: error instanceof Error ? error.message : '解析失败' }));
  }
}

export async function runKnowledgeIngest(documentId: string): Promise<void> {
  const { error } = await requireClient().functions.invoke('knowledge-ingest', { body: { documentId } });
  if (error) throw new Error('文档解析失败，可稍后重试或更换文件');
}

export async function setKnowledgeDocumentStatus(id: string, status: Extract<KnowledgeDocumentStatus, 'draft' | 'published' | 'withdrawn'>): Promise<KnowledgeDocument> {
  const { error } = await requireClient().from('knowledge_documents').update({ status, error: null }).eq('id', id);
  if (error) throw new Error('状态更新失败，请重试');
  return reloadDocument(id);
}

export async function deleteKnowledgeDocument(document: KnowledgeDocument): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('knowledge_documents').delete().eq('id', document.id);
  if (error) throw new Error('删除失败，请重试');
  await client.storage.from('knowledge').remove([document.storagePath]);
}
