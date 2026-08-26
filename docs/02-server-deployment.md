# 服务端与 Web/PWA 部署

本文给出生产上线的推荐顺序。示例域名均使用 `https://app.example.com`，请替换为实际域名。

## 1. 前置条件

- Node.js 22 和 npm。
- 一个 Supabase 项目，以及其 Project Ref、Project URL、匿名公钥。
- 一个可托管 HTTPS 静态文件的站点服务，并能配置 SPA 回退。
- AI 聊天 Provider 与 Embedding Provider 的 API 凭证。Embedding 模型必须返回 **1536 维**向量。
- 如使用 GitHub Actions：仓库管理员权限和 GitHub Environments 的配置权限。

## 2. 创建并初始化 Supabase 项目

在仓库根目录执行。PowerShell 示例：

```powershell
npm ci
npx supabase login
npx supabase link --project-ref <SUPABASE_PROJECT_REF>
npx supabase db push
```

`db push` 会按 `supabase/migrations/` 的顺序创建扩展、数据表、RLS 策略、`record_sale`/知识库 RPC 和私有 `knowledge` Storage 桶。不要在一个已有业务数据、但未记录本项目 migration 历史的数据库上直接执行此命令。

在 Supabase Dashboard 的 Authentication 设置中完成以下配置：

- 开启 Email provider。
- 将 Site URL 设置为 `https://app.example.com`。
- 将 `https://app.example.com/login` 加到 Redirect URLs。重置密码邮件会跳转到这个地址。
- 按运营策略决定是否启用 Confirm email。开启时，注册用户必须先在邮箱中确认，再登录建店。

## 3. 配置 Edge Function 密钥

在 Supabase Dashboard 的 Edge Functions Secrets 中，或通过 CLI 设置以下业务密钥。不要写到 `.env` 前端文件、Git 仓库或浏览器配置中。

```powershell
npx supabase secrets set `
  DEEPSEEK_API_KEY="<chat-api-key>" `
  DEEPSEEK_BASE_URL="https://api.deepseek.com/v1" `
  DEFAULT_CHAT_MODEL="deepseek-chat" `
  EMBEDDING_API_KEY="<embedding-api-key>" `
  EMBEDDING_BASE_URL="<embedding-api-base-url>" `
  EMBEDDING_MODEL="<embedding-model-name>" `
  ALLOWED_ORIGIN="https://app.example.com"
```

托管 Supabase Edge Runtime 会提供 `SUPABASE_URL`、`SUPABASE_ANON_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY`；不要将后两者中的 service role 值配置为前端变量。当前默认建店逻辑使用 DeepSeek。若要使用 `openai-compatible` 模型配置，还必须设置 `OPENAI_COMPATIBLE_API_KEY` 和 `OPENAI_COMPATIBLE_BASE_URL`。

`ALLOWED_ORIGIN` 是当前函数实现支持的单个 Origin。只发布 Web/PWA 时应设置正式域名；需要同时调试多个浏览器 Origin 或 Capacitor 原生壳时，先评估 CORS 改造，不能以逗号分隔多个域名。

## 4. 部署 Edge Functions

数据库迁移成功后部署函数。前三个公开函数必须显式关闭 JWT 校验，命令与 `supabase/config.toml` 和 CI 保持一致：

```powershell
npx supabase functions deploy ai-chat --no-verify-jwt
npx supabase functions deploy public-store --no-verify-jwt
npx supabase functions deploy knowledge-search --no-verify-jwt
npx supabase functions deploy ai-command
npx supabase functions deploy knowledge-ingest
npx supabase functions deploy onboarding
npx supabase functions deploy import-products
```

部署后可用无效 slug 验证公开函数已工作，应得到 HTTP 404：

```powershell
$headers = @{ apikey = "<SUPABASE_ANON_KEY>" }
(Invoke-WebRequest "https://<PROJECT_REF>.supabase.co/functions/v1/public-store?slug=invalid-store" -Headers $headers -SkipHttpErrorCheck).StatusCode
```

## 5. 构建并发布 Web/PWA

将 [配置参考](03-configuration.md) 中的三个 `VITE_*` 值注入构建环境后构建：

```powershell
npm run build
```

把 `dist/` 内的**内容**上传到静态站点根目录。托管服务必须满足：

- 全站 HTTPS；顾客扫码和 PWA 依赖安全上下文。
- 对未知的前端路由回退到 `index.html`，至少包括 `/login`、`/tabs/*`、`/settings` 和 `/s/*`。
- 不能把 `dist/` 外的仓库文件、`.env` 或 `supabase/` 上传到网站根目录。

Nginx 示例：

```nginx
server {
  listen 443 ssl http2;
  server_name app.example.com;
  root /var/www/smart-sale;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

配置域名后重新构建并发布。`VITE_APP_PUBLIC_BASE_URL` 在构建时写入二维码和公开链接；仅修改 CDN/域名不会更新已构建的前端。

## 6. GitHub Actions 部署方式

仓库已有两条工作流：

- `.github/workflows/supabase.yml`：手动选择 `development` 或 `production` 后，连接 Supabase、执行 migration、部署函数并探测公开 API。
- `.github/workflows/ci.yml`：构建并归档 Web/PWA、Android、iOS 制品；打 `vX.Y.Z` tag 后创建 GitHub Release。

为每个 GitHub Environment 配置：

| 类型 | 名称 | 用途 |
| --- | --- | --- |
| Variable | `VITE_SUPABASE_URL` | 前端请求的 Supabase Project URL |
| Variable | `VITE_SUPABASE_ANON_KEY` | 前端公开匿名公钥 |
| Variable | `VITE_APP_PUBLIC_BASE_URL` | Web/PWA 正式根地址，不带尾部 `/` |
| Secret | `SUPABASE_ACCESS_TOKEN` | Supabase CLI 的部署授权 |
| Secret | `SUPABASE_PROJECT_REF` | 对应 Supabase Project Ref |

先在 Supabase 项目配置函数密钥，再手动运行 `Supabase development deploy` 工作流。CI 工作流目前只生成 `dist` zip，需再由托管平台的部署流程上传该 zip 解压后的内容，或补充该平台自己的发布 Action。

## 本机开发环境

本机需要 Docker Desktop。启动 Supabase 后从状态输出取得 URL 和 anon key：

```powershell
npm run db:start
npm run db:status
Copy-Item .env.example .env.local
npm run dev
```

将 `.env.local` 的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 改为本机值，然后执行 `npm run db:reset` 以应用 migration。未配置 Supabase 时应用会进入本地演示模式；这不是生产验证环境。
