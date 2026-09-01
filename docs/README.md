# 智售引擎文档中心

本目录以当前代码实现为准，面向平台部署人员、门店商家和一线运营人员。

## 快速定位

| 目标 | 入口或文档 |
| --- | --- |
| 上线服务端和 Web/PWA | [服务端部署](02-server-deployment.md) |
| 配置域名、前端变量、Supabase 和 AI | [配置参考](03-configuration.md) |
| 商家登录、建店、生成二维码 | [商家端使用](04-merchant-guide.md) |
| 顾客扫码或打开公开链接 | [客户端使用](05-customer-guide.md) |
| 日常检查、故障定位与回滚 | [运维手册](06-operations.md) |
| 构建 Android/iOS 与 GitHub Release | [发布手册](07-release.md) |
| 本机一键运行竞赛 Demo | [本机演示](08-local-demo.md) |
| 竞赛验收与现场演练 | [竞赛验收手册](10-competition-acceptance.md) |
| 商品、知识库与现场演示素材 | [演示素材目录](demo-materials/演示素材使用说明.md) |
| Cloudflare Pages、GitHub Pages、腾讯云 EdgeOne 静态发布 | [静态网站部署](09-static-hosting.md) |

## 三个正式地址

设正式站点域名为 `https://app.example.com`：

| 使用者 | 地址 | 是否登录 |
| --- | --- | --- |
| 商家后台 | `https://app.example.com/login` | 需要邮箱和密码 |
| 已登录商家首页 | `https://app.example.com/tabs/home` | 需要 |
| 顾客门店页 | `https://app.example.com/s/<store-slug>` | 不需要 |

`<store-slug>` 在首次建店时自动生成。商家应在“我的 -> 门店服务与二维码”获取带动态令牌的顾客入口，不要手工猜测 slug 或省略 `token` 参数。

## 阅读顺序

1. 部署人员按 [服务端部署](02-server-deployment.md) 完成 Supabase、函数和 Web/PWA 发布。
2. 按 [配置参考](03-configuration.md) 做上线前配置检查。
3. 商家按 [商家端使用](04-merchant-guide.md) 注册、建店、录入商品并开启公开服务。
4. 用 [运维手册](06-operations.md) 的验收清单验证商家端、顾客端和 AI 服务。

## 文档边界

- 本项目的“服务端”由 Supabase Postgres、Auth、Storage、RLS/RPC 和 Edge Functions 组成；没有需要单独部署的 Node/Java 服务。
- Web/PWA 为静态构建产物 `dist/`，可部署到任意支持 HTTPS 和 SPA 回退的静态托管服务。
- 当前仓库的 GitHub Actions 会构建和归档 Web/Android/iOS 制品，但**不会自动将 `dist/` 发布到静态托管商**。具体发布步骤见部署文档。
