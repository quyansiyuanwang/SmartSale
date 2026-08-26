# 系统架构

## 组成

```text
商家浏览器 / PWA / 原生 App          顾客浏览器 / PWA
             |                                |
             +---------- HTTPS ---------------+
                                |
                       Web/PWA 静态站点
                                |
                 Supabase Auth / PostgREST / Functions
                    |             |              |
                 Postgres        Storage       AI / Embedding Provider
```

- 前端：Vue 3、Ionic、Vite PWA，构建后位于 `dist/`。
- 数据：Supabase Postgres，以 `store_id` 隔离门店数据；RLS 控制商家成员权限。
- 身份：Supabase Auth 邮箱密码。商家首次登录后通过 `onboarding` 函数创建门店和 owner 成员关系。
- 文件：Supabase Storage `knowledge` 私有桶，单文件最大 10 MB。
- 服务端逻辑：Supabase Edge Functions，代码位于 `supabase/functions/`。

## 公开与受保护接口

| Function | JWT 校验 | 用途 |
| --- | --- | --- |
| `public-store` | 否 | 按 slug 返回公开门店、已发布商品和活动 |
| `ai-chat` | 否 | 顾客售前问答，按 IP/门店限制为 20 次/分钟 |
| `knowledge-search` | 否 | 公开知识库向量检索 |
| `onboarding` | 是 | 首次创建门店和 owner |
| `import-products` | 是 | owner/manager 批量导入商品 |
| `knowledge-ingest` | 是 | owner/manager 解析知识库文件并写入向量 |
| `ai-command` | 是 | 受保护的商家 AI 指令 |

公开接口并不等于可读数据库。公开数据由 Edge Function 使用服务端权限筛选，仅暴露公开门店的已发布商品和活动。前端只能使用 Supabase 匿名公钥，`service_role`、模型 API Key 和向量 API Key 只存在函数运行环境。

## 门店生命周期

1. 商家通过 `/login` 注册或登录。
2. 没有门店成员关系的用户被引导至 `/onboarding`。
3. `onboarding` 创建 `stores`、`store_members(owner)` 和默认 AI 模型配置，并生成唯一 slug。
4. 商家在 `/settings` 配置资料、商品和顾客二维码。
5. 顾客通过 `/s/<store-slug>` 访问。若 `public_enabled=false` 或 `service_status=suspended`，公开接口返回暂停状态。

## 角色

| 角色 | 权限摘要 |
| --- | --- |
| `owner` | 门店资料、成员、模型配置、活动、知识库、商品和销售 |
| `manager` | 活动、知识库、商品和销售；不能管理 owner 专属设置 |
| `staff` | 商品和销售；不能批量导入、管理活动/知识库或运行受保护 AI 指令 |

当前前端首次建店仅创建 owner。新增成员需要由具备数据库管理权限的人员按 RLS/角色模型维护，不能将用户直接当作同一门店成员而绕过 `store_members`。
