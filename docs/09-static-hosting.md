# 静态网站部署

Web/PWA 构建产物是供应商无关的 `dist/`。商家 Android APK 使用相同构建配置，顾客始终通过 HTTPS 地址扫码访问 `/s/<store-slug>`。

## 构建变量

所有托管方式均在构建环境设置：

```dotenv
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_APP_PUBLIC_BASE_URL=https://app.example.com
VITE_APP_BASE_PATH=/
VITE_DEMO_MODE=false
```

执行 `npm ci` 和 `npm run build` 后，只上传 `dist/` 内容。不要上传 `.env*`、`supabase/` 或模型 Key。

## Cloudflare Pages

连接 Git 仓库或上传 `dist/`，构建命令为 `npm run build`，输出目录为 `dist`。使用自定义域名后，将该域名写入 `VITE_APP_PUBLIC_BASE_URL`、Supabase Site URL、Redirect URLs 和 `ALLOWED_ORIGINS`。Pages 使用根目录部署时 `VITE_APP_BASE_PATH=/`。

## GitHub Pages

使用用户/组织自定义域名时按根目录部署。使用仓库站点时设置 `VITE_APP_BASE_PATH=/仓库名/` 与 `VITE_APP_PUBLIC_BASE_URL=https://<用户>.github.io/仓库名`。Pages 必须配置 SPA 回退；若无法配置，使用 Cloudflare Pages 或 EdgeOne，避免扫码 `/s/<slug>` 返回 404。

## 腾讯云 EdgeOne 或 Nginx

将 `dist/` 发布为静态源站，启用 HTTPS，并将不存在的路由回退为 `/index.html`。Nginx 可使用 `try_files $uri $uri/ /index.html;`。构建变量中的公开基础 URL 必须与实际顾客访问地址完全一致。

## 上线验收

1. 用未登录浏览器直接打开 `https://<域名>/s/<store-slug>`，确认不是 404、没有商家后台入口。
2. 在商家 App 登录、打开设置并重新下载二维码，扫码后确认商品、促销和 AI 问答正常。
3. 顾客提问后，在商家“顾客咨询”和“经营机会”页面确认记录出现。
