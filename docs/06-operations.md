# 运维与故障排查

## 上线验收清单

1. 以未登录浏览器访问 `https://app.example.com/login`，确认能显示登录页。
2. 新注册测试账号，按邮箱验证策略完成登录并创建测试门店。
3. 在测试门店新增一个已发布商品和一个促销。
4. 打开设置页，确认二维码中的链接是 `https://app.example.com/s/<slug>?token=<random-token>`，并确认页面显示的有效期正常。
5. 在无痕窗口打开该链接，确认门店资料、商品和促销均可见。
6. 在顾客页提问，确认商家端“顾客咨询”出现记录。
7. 在商家端录入一笔销售，确认库存减少且报表变化。
8. 关闭公开售前服务，确认顾客旧链接显示暂停页；再恢复服务。
9. 在设置页“知识库”上传一份小型 TXT 文档并发布；在顾客页提问相关问题，确认回答引用该内容后再撤回。
10. 在登录页走一遍“忘记密码”，确认邮件回到 `/login`。

## 常用检查命令

```powershell
# 前端质量与构建
npm run lint
npm test
npm run build

# 本机 Supabase 状态
npm run db:status

# 链接到目标项目后查看 migration 历史
npx supabase migration list

# 查看已设置的函数密钥名称，不应在日志或文档中泄露值
npx supabase secrets list
```

## 故障对照

| 现象 | 优先检查 | 处理 |
| --- | --- | --- |
| 生产环境出现演示数据 | 构建时是否缺少 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` 或误设 `VITE_DEMO_MODE=true` | 修正构建变量，重新构建并发布 `dist/` |
| 登录/忘记密码跳转到错误域名 | Supabase Site URL、Redirect URLs | 同步设置为正式 HTTPS 域名和 `/login` |
| `/s/<slug>` 直接打开 404 | 静态托管 rewrite | 添加 SPA 回退至 `index.html` |
| 所有顾客页提示服务不可用 | `public-store` Function 部署、Anon Key、函数日志 | 重新部署函数，检查 URL/key 与函数日志 |
| 顾客问答 503 | `ai-chat` 日志、聊天/向量密钥、Embedding 维度 | 配齐密钥；Embedding 返回必须为 1536 维 |
| 顾客问答 429 | 单 IP 在同一门店 1 分钟内超过 20 次 | 等待 60 秒；按产品策略调整限流实现 |
| 知识库处理失败 | 文件类型/10 MB 限制、Embedding 配置、函数日志 | 使用 PDF、DOCX、TXT 或 Markdown，修复密钥后重新处理 |
| 商家能登录但无数据或被带到建店页 | `store_members` 记录与 RLS | 确认用户 ID 与门店成员关系，检查 `onboarding` 日志 |
| 服务开关无法保存 | owner 身份和 `stores` RLS | 用 owner 账号操作，检查迁移是否完整 |

## 日常维护

- 每次发布前运行 `npm run lint`、`npm test`、`npm run build`。
- 发布 migration 前先在 development Supabase 项目验证，再推送 production。
- 定期检查 Edge Function 日志中的 401、403、429、503；不要把请求中的 Authorization 或 API Key 复制到工单。
- 为 Supabase 数据库配置备份与恢复演练。商品、销售、咨询和知识库元数据均存储在该项目中。
- 当模型密钥泄露或怀疑泄露时，立即在 Provider 控制台轮换密钥，再更新 Function Secret 并重新部署相关函数。

## 回滚

- 前端：保留上一个可用 `dist/` 制品；发生问题时重新发布该静态文件版本。由于前端变量在构建期注入，回滚制品会一并回滚配置。
- Edge Function：从已验证的 Git commit 部署上一版本函数。确认与当前数据库 schema 兼容后再执行。
- 数据库：迁移是向前发布的，不应通过手工删除 migration 记录回滚。对破坏性变更应新增一条修复 migration，并先从备份验证。
