import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ currentStore: { value: { id: 'store-1', slug: 'demo-store', name: '演示门店', role: 'owner' } } })
}));

const mocks = vi.hoisted(() => {
  type Result = { data: unknown; error: unknown };
  const storageUpload = vi.fn(async (): Promise<Result> => ({ data: null, error: null }));
  const storageRemove = vi.fn(async (): Promise<Result> => ({ data: null, error: null }));
  const functionsInvoke = vi.fn(async (): Promise<Result> => ({ data: null, error: null }));
  const from = vi.fn();
  return { storageUpload, storageRemove, functionsInvoke, from };
});
const { storageUpload, storageRemove, functionsInvoke, from } = mocks;

vi.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: () => ({ upload: mocks.storageUpload, remove: mocks.storageRemove }) }, functions: { invoke: mocks.functionsInvoke }, from: mocks.from },
  hasSupabaseConfig: true,
  isDemoMode: false
}));

import { deleteKnowledgeDocument, listKnowledgeDocuments, runKnowledgeIngest, setKnowledgeDocumentStatus, uploadKnowledgeDocument, validateKnowledgeFile, KNOWLEDGE_MAX_BYTES } from './knowledge-admin.service';
import type { KnowledgeDocument } from '@/types';

const docRow = (status: string) => ({
  id: 'doc-1',
  file_name: '水龙头安装指南.pdf',
  storage_path: 'store-1/1-水龙头安装指南.pdf',
  mime_type: 'application/pdf',
  size_bytes: 1024,
  status,
  error: null,
  created_at: '2026-08-31T00:00:00Z'
});

/** Supabase query builder mock: awaited chains resolve to mutateResult; .single() resolves to insertResult once insert ran, then rowResult. */
function makeBuilder(mutateResult: { error: unknown }, insertResult: { data?: unknown; error: unknown }, rowResult: { data?: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  let inserted = false;
  const mutatePromise = Promise.resolve(mutateResult);
  builder.select = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.insert = vi.fn(() => { inserted = true; return builder; });
  builder.update = vi.fn(() => builder);
  builder.delete = vi.fn(() => builder);
  builder.single = vi.fn(async () => (inserted ? insertResult : rowResult));
  (builder as { then: unknown }).then = mutatePromise.then.bind(mutatePromise);
  return builder;
}

describe('知识库文档管理', () => {
  beforeEach(() => {
    storageUpload.mockClear().mockResolvedValue({ data: null, error: null });
    storageRemove.mockClear().mockResolvedValue({ data: null, error: null });
    functionsInvoke.mockClear().mockResolvedValue({ data: null, error: null });
    from.mockReset();
  });

  it('拒绝超过 10 MB 的文件', () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: KNOWLEDGE_MAX_BYTES + 1 });
    expect(() => validateKnowledgeFile(file)).toThrow('10 MB');
  });

  it('拒绝不支持的文件类型', () => {
    expect(() => validateKnowledgeFile(new File(['x'], 'a.exe', { type: 'application/octet-stream' }))).toThrow('PDF');
  });

  it('上传后调用解析并把状态刷新为可发布草稿', async () => {
    from.mockImplementation(() => makeBuilder({ error: null }, { data: docRow('processing'), error: null }, { data: docRow('draft'), error: null }));
    const file = new File(['安装步骤'], '水龙头安装指南.pdf', { type: 'application/pdf' });
    const document = await uploadKnowledgeDocument(file);
    expect(document.status).toBe('draft');
    expect(storageUpload).toHaveBeenCalledTimes(1);
    expect((storageUpload.mock.calls as unknown[][])[0][0]).toMatch(/^store-1\/\d+-水龙头安装指南\.pdf$/);
    expect(functionsInvoke).toHaveBeenCalledWith('knowledge-ingest', { body: { documentId: 'doc-1' } });
  });

  it('上传记录创建失败时清理已上传的存储文件', async () => {
    from.mockImplementation(() => makeBuilder({ error: null }, { data: null, error: { message: 'duplicate' } }, { error: null }));
    const file = new File(['x'], 'a.txt', { type: 'text/plain' });
    await expect(uploadKnowledgeDocument(file)).rejects.toThrow('知识库记录创建失败');
    expect(storageRemove).toHaveBeenCalledTimes(1);
  });

  it('列表接口按创建时间倒序返回文档', async () => {
    const builder = makeBuilder({ error: null }, { error: null }, { error: null });
    const listPromise = Promise.resolve({ data: [docRow('published')], error: null });
    builder.then = listPromise.then.bind(listPromise);
    from.mockReturnValue(builder);
    const list = await listKnowledgeDocuments();
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('published');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('发布/撤回通过状态更新完成', async () => {
    const builder = makeBuilder({ error: null }, { error: null }, { data: docRow('published'), error: null });
    from.mockReturnValue(builder);
    const document = await setKnowledgeDocumentStatus('doc-1', 'published');
    expect(document.status).toBe('published');
    expect(builder.update).toHaveBeenCalledWith({ status: 'published', error: null });
    expect(builder.eq).toHaveBeenCalledWith('id', 'doc-1');
  });

  it('删除文档时同步清理存储对象', async () => {
    const builder = makeBuilder({ error: null }, { error: null }, { error: null });
    from.mockReturnValue(builder);
    const document: KnowledgeDocument = {
      id: 'doc-1',
      fileName: 'a.pdf',
      storagePath: 'store-1/1-a.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      status: 'draft',
      createdAt: '2026-08-31T00:00:00Z'
    };
    await deleteKnowledgeDocument(document);
    expect(builder.delete).toHaveBeenCalled();
    expect(storageRemove).toHaveBeenCalledWith(['store-1/1-a.pdf']);
  });

  it('解析函数失败时向上抛出可读错误', async () => {
    functionsInvoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(runKnowledgeIngest('doc-1')).rejects.toThrow('文档解析失败');
  });
});
