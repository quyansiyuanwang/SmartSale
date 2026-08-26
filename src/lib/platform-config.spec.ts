import { beforeEach, describe, expect, it } from 'vitest';
import { lastPublicStoreSlug, publicStoreUrl, rememberPublicStore } from './platform-config';

describe('平台公开链接配置', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('保存并恢复合法的最近公开门店 slug', () => {
    rememberPublicStore('demo-store');
    expect(lastPublicStoreSlug()).toBe('demo-store');

    rememberPublicStore('不合法 slug');
    expect(lastPublicStoreSlug()).toBe('demo-store');
  });

  it('公开链接使用当前站点基础地址', () => {
    expect(publicStoreUrl('demo-store')).toContain('/s/demo-store');
  });
});
