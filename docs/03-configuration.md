# 配置参考

## 前端构建变量

这些变量在 `npm run build` 时由 Vite 打入静态文件，浏览器用户可以读取，因此只能放公开信息。

| 变量 | 必填 | 示例 | 说明 |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | 是 | `https://abc.supabase.co` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | 是 | `eyJ...` | Supabase 匿名公钥，不是 service role key |
| `VITE_APP_PUBLIC_BASE_URL` | 是 | `https://app.example.com` | 顾客二维码和 `/s/<slug>` 链接的根地址 |
| `VITE_APP_BASE_PATH` | 否 | `/` | 静态站点部署子路径；GitHub Pages 仓库站点使用 `/仓库名/` |
| `VITE_DEMO_MODE` | 否 | `false` | 仅本机演示时设 `true`；生产不得设为 `true` |

推荐在部署平台的构建环境中配置这些值，或在本机将 `.env.example` 复制为未提交的 `.env.local`。示例：

```dotenv
VITE_SUPABASE_URL=https://abc.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_APP_PUBLIC_BASE_URL=https://app.example.com
VITE_APP_BASE_PATH=/
VITE_DEMO_MODE=false
```

生产构建中遗漏 URL 或匿名公钥时，应用会显示“平台服务尚未配置”，不会写入本地演示数据。上线验收必须确认“我的 -> 数据存储”显示 `Supabase 多门店`。

## 本机 Demo AI

复制 `.env.demo.local.example` 为 `.env.demo.local`，填写 `DEMO_AI_BASE_URL`、`DEMO_AI_API_KEY` 与 `DEMO_AI_MODEL` 后执行 `npm run demo`。这三个变量只由本机 Vite 服务读取，不能使用 `VITE_` 前缀；不要将该文件提交、上传或用于静态生产构建。

## Edge Function 密钥

| 变量 | 必填条件 | 用途 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 默认必填 | 默认 `deepseek` 聊天模型的凭证 |
| `DEEPSEEK_BASE_URL` | 否 | 默认 `https://api.deepseek.com/v1` |
| `DEFAULT_CHAT_MODEL` | 否 | 新门店默认模型，默认 `deepseek-chat` |
| `EMBEDDING_API_KEY` | 知识库 RAG 必填 | 向量接口凭证 |
| `EMBEDDING_BASE_URL` | 知识库 RAG 必填 | 必须支持 `/embeddings` |
| `EMBEDDING_MODEL` | 知识库 RAG 必填 | 返回 1536 维向量的模型名 |
| `OPENAI_COMPATIBLE_API_KEY` | 使用兼容模型时必填 | 非 DeepSeek 聊天 Provider 凭证 |
| `OPENAI_COMPATIBLE_BASE_URL` | 使用兼容模型时必填 | 兼容 Provider 的 API 根地址 |
| `ALLOWED_ORIGINS` | 生产推荐 | Function CORS 允许的 Origin 白名单，逗号分隔，例如正式域名和 `https://localhost` |

Supabase 托管函数还会自动取得 `SUPABASE_URL`、`SUPABASE_ANON_KEY` 与 `SUPABASE_SERVICE_ROLE_KEY`。不要将 `SUPABASE_SERVICE_ROLE_KEY`、任意聊天/向量 API Key 放入前端或 GitHub Variables。

顾客聊天在向量检索暂不可用时仍会尝试基于商品和促销生成回答；但知识库导入和公开知识检索需要完整的 Embedding 配置，生产环境应始终配置。

## Supabase 控制台配置

| 区域 | 必做配置 |
| --- | --- |
| Authentication / Providers | 启用 Email |
| Authentication / URL Configuration | 设置 Site URL 和 `/login` Redirect URL |
| Edge Functions / Secrets | 设置 AI、Embedding、CORS 配置 |
| Database | 仅通过 `supabase db push` 发布 schema/migration |
| Storage | migration 会创建私有 `knowledge` 桶，勿改成 public |

## 域名与路由

`VITE_APP_PUBLIC_BASE_URL`、Supabase Site URL 和浏览器实际访问域名必须一致，且均使用 `https://`。部署到子目录时，`VITE_APP_PUBLIC_BASE_URL` 必须包含子目录，且 `VITE_APP_BASE_PATH` 必须使用相同路径。

静态托管需将所有前端路径回退至 `index.html`。否则直接打开或扫码 `/s/<slug>` 会由服务器返回 404，尽管从首页点击可以正常工作。

## 配置变更后的动作

| 改动 | 后续动作 |
| --- | --- |
| 修改 `VITE_*` | 重新 `npm run build` 并重新发布 `dist/` |
| 修改 Function Secrets | 重新部署受影响的 Edge Function，或按平台规则使新密钥生效 |
| 新增 migration | `npx supabase db push`，再部署相关 Function |
| 修改 Site URL/Redirect URLs | 用注册、登录、忘记密码流程回归验证 |
| 更换正式域名 | 同时改前端变量、Auth URL 配置、CORS 值和静态托管 DNS/回退规则 |
