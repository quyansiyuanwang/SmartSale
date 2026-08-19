# 智售引擎（Smart Sale）

> AI 赋能传统小微零售的轻量化改造 · MVP
> Ionic 8 + Vue 3 + TypeScript + Capacitor · Web/PWA 优先，Supabase 多租户生产架构

「智售引擎」首期 MVP 包含两个入口，同一份本地数据、同一条业务闭环：

- **智店管家（商家端）**：经营概览、商品管理、销售录入（自动扣库存）、库存预警、滞销分析、周经营报表、语音指令、顾客需求看板、AI 配置。
- **智购顾问（买家端）**：扫码即用入口、找货问答（货架/价格/替代品）、知识库问答、场景化清单推荐（装修/开学文具/家庭药箱/百元工具）、当前促销展示。

买家咨询（找货/问答）会实时写入商家「顾客需求」看板，形成「录入销售 → 库存变化 → 顾客问答 → 商家响应」的完整闭环。

---

## 快速开始

```bash
# 安装依赖（需要 Node 22）
npm install

# 本地开发（浏览器访问 http://localhost:5173）
npm run dev

# 运行单元测试
npm test

# 生产构建（vue-tsc 类型检查 + vite 打包，生成 PWA 产物）
npm run build

# 预览生产构建
npm run preview

# 同步 Capacitor 原生配置（Web 与原生项目共享配置）
npx cap sync
```

### PWA

- 构建产物为可安装 PWA（含 `manifest.webmanifest` 与 Service Worker，`zh-CN`，可离线运行）。
- 在 Chrome / Edge 中打开站点，地址栏出现安装图标即可安装到桌面。
- 买家端以 PWA 形式替代原方案文档中的微信小程序（Capacitor 不支持小程序，详见「已知限制」）。

### Capacitor 原生工程

```bash
# Web 构建并同步 Android / iOS 原生工程
npm run android:sync
npm run ios:sync

# 安装 Android SDK 后打开 Android Studio
npx cap open android
```

`capacitor.config.ts` 已配置 `appId=com.smartsale.app`、`appName=智售引擎`。

### 多平台 CI 与发布

项目通过 GitHub Actions 构建 Web/PWA、Android 和 iOS 包体：

- 任意分支 `push`：运行 lint、单元测试和生产构建，并保留 Web/PWA zip、Android debug APK、iOS 未签名 archive 制品 30 天。
- Pull Request：只运行质量检查，不重复生成下载制品。
- `workflow_dispatch`：从 Actions 页面手动触发，与分支构建生成相同的测试制品。
- 正式发布：提交 `package.json` 版本后，创建同版本 tag，例如版本为 `1.2.3` 时执行 `git tag v1.2.3` 并推送。tag 必须匹配 `vX.Y.Z`。

测试人员可在对应 Actions run 的 **Artifacts** 区域下载包体。正式 tag 会创建 GitHub Release，包含 Web/PWA zip、Android APK/AAB、iOS IPA 与 `SHA256SUMS.txt` 校验文件。

#### 正式发布签名配置

正式 tag 不会发布未签名移动端包。请在仓库级 GitHub Actions Secrets 配置以下值；工作流中的 `release` Environment 仅用于保护正式 Release 的审批权限。

| 平台 | Secret | 内容 |
| --- | --- | --- |
| Android | `ANDROID_KEYSTORE_BASE64` | Base64 编码的 `.jks` / `.keystore` 文件 |
| Android | `ANDROID_KEYSTORE_PASSWORD` | keystore 密码 |
| Android | `ANDROID_KEY_ALIAS` | key alias |
| Android | `ANDROID_KEY_PASSWORD` | key 密码 |
| iOS | `APPLE_CERTIFICATE_BASE64` | Base64 编码的 distribution `.p12` 证书 |
| iOS | `APPLE_CERTIFICATE_PASSWORD` | `.p12` 密码 |
| iOS | `APPLE_PROVISIONING_PROFILE_BASE64` | Base64 编码的 Ad Hoc provisioning profile |
| iOS | `APPLE_TEAM_ID` | Apple Developer Team ID |
| iOS | `IOS_KEYCHAIN_PASSWORD` | CI 临时 keychain 的随机密码 |

任一 Secret 缺失时，tag 工作流会在创建 Release 前失败。非 tag 的 iOS 制品是未签名 `.xcarchive.zip`，不能直接安装到真机；正式 iOS IPA 使用 Ad Hoc profile，测试设备必须已登记在该 profile 中。

---

## 目录结构

```
smart-sale/
├─ goal/                      # 项目立项文档（保留不动）
├─ public/
│  ├─ icons/                  # PWA 图标（192/512/maskable）
│  └─ favicon.png
├─ src/
│  ├─ components/             # 通用组件
│  ├─ composables/
│  │  ├─ useSpeech.ts         # Web Speech API 语音指令（渐进增强）
│  │  └─ useToast.ts          # 轻量 Toast
│  ├─ router/index.ts         # 路由（商家 Tab / 买家 / 子页面）
│  ├─ services/               # 数据层与业务逻辑（仓储式）
│  │  ├─ storage.service.ts   # Preferences 读写（JSON 集合）
│  │  ├─ seed.ts / data.ts    # 演示种子数据与响应式状态
│  │  ├─ product.service.ts   # 商品增删改查
│  │  ├─ sale.service.ts      # 销售录入（自动扣库存）
│  │  ├─ report.service.ts    # 周报 / 滞销 / 热销统计
│  │  ├─ query.service.ts     # 顾客咨询（双端联动）
│  │  ├─ store.service.ts     # 店铺资料 / AI 配置
│  │  └─ ai.service.ts        # DeepSeek 接入 + 本地降级
│  ├─ theme/                  # Ionic 主题与自定义样式
│  ├─ types/index.ts          # 核心类型定义
│  └─ views/                  # 页面（商家 5 Tab + 买家）
├─ tests/                     # e2e 模板（预留）
├─ android/                   # Capacitor Android 原生工程
├─ ios/                       # Capacitor iOS 原生工程
├─ capacitor.config.ts
└─ vite.config.ts             # Vite + PWA + Vitest 配置
```

### 核心类型（`src/types/index.ts`）

| 类型 | 说明 |
| --- | --- |
| `Product` | 条码 / 类目 / 进价 / 售价 / 库存 / 安全库存 / 货架位置 / 描述 |
| `SaleRecord` | 销售记录（商品、数量、金额、时间） |
| `CustomerQuery` | 顾客咨询（问题、回答、来源、状态） |
| `Promotion` | 促销活动 |
| `StoreProfile` | 店铺资料 |
| `LlmConfig` | DeepSeek 配置（API Key / baseUrl / model / 超时） |

---

## AI 接入说明（DeepSeek）

1. 进入商家端 **「更多 → AI 设置」**，填写：
   - `API Key`：DeepSeek 平台申请的密钥（仅保存于本机 Preferences，`type=password`）。
   - `Base URL`：默认 `https://api.deepseek.com`
   - `Model`：默认 `deepseek-chat`
   - 超时：默认 30 秒
2. 保存后，买家端问答与商家端语音指令均调用 DeepSeek。
3. **未配置 Key / 调用失败 / 超时**时自动降级为本地规则回复，并标注「演示模式」徽标，功能仍可用（关键词匹配商品、货架、价格、场景清单、知识库）。

> ⚠️ **安全说明（MVP）**：API Key 仅本地存储，无服务端中转、无加密，属于 MVP 演示级别，请勿在生产环境直接使用。

### 支持的语音指令（Web Speech API，Chrome/Edge）

- `查胶带库存`
- `改胶带价格为 5`
- `本周热销` / `周报`
- 浏览器不支持语音时自动隐藏语音按钮。

---

## 验收基线

- [x] 种子数据可重置（更多 → 重置演示数据）
- [x] 销售录入自动扣库存，低于安全库存出现预警
- [x] 周报（热销 / 滞销 / 利润）计算正确（Vitest 固定种子断言）
- [x] 买家问答（Mock / AI）可用，且问题实时出现在商家「顾客需求」看板
- [x] `npm run build` 通过；PWA 可安装
- [x] 无 Key 时「演示模式」标识正确

### 测试

```bash
npm test   # Vitest：存储 CRUD/种子重置、扣库存与预警、周报/滞销、AI 降级
```

---

## 已知限制（MVP）

- 单店铺、无登录 / 权限体系；多员工、会员、积分等不在本次范围。
- 数据仅存本地单机（`@capacitor/preferences`），不引入 SQLite / 后端；数据层为仓储式接口，后续可平滑替换。
- 买家端以 Web/PWA 替代微信小程序（Capacitor 不支持小程序）。
- Android / iOS 原生包由 GitHub Actions 构建：Android 使用 Ubuntu runner，iOS 使用 macOS runner；本地 iOS 构建仍需 macOS 与 Xcode。

## 文档

- 立项依据 / 双 Agent 方案详见 `goal/` 目录。
# 生产环境配置

### 简化配置

本机开发可以运行 `npm run db:start`（需要 Docker Desktop），然后在管理端「店铺与服务设置」填写 Supabase URL、Anon Key 和 AI API Key。默认本机数据库地址是 `http://127.0.0.1:54321`，Anon Key 可通过 `npm run db:status` 查看。远端项目同样只需填写项目 URL 与 anon key，保存后页面会刷新并连接对应数据库。

本机模式的 AI Key 会保存到当前设备的 Capacitor Preferences，适合开发和内网使用。公开生产环境不要让顾客设备持有供应商 Key，应使用 `ai-chat` Edge Function Secrets。

生产模式使用 Supabase Postgres、Auth、Storage 和 Edge Functions。复制 `.env.example` 到本地环境并填写 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`；不要把供应商密钥写入前端环境变量。

执行 `supabase db reset` 或将 `supabase/migrations` 部署到开发项目后，为门店创建成员并配置 Storage。Edge Functions 需要以下 Secrets：`DEEPSEEK_API_KEY` 或 `OPENAI_COMPATIBLE_API_KEY`/`OPENAI_COMPATIBLE_BASE_URL`，以及 `EMBEDDING_API_KEY`、`EMBEDDING_BASE_URL`、`EMBEDDING_MODEL`、`SUPABASE_SERVICE_ROLE_KEY`。知识库单文件上限 10 MB，文档必须发布后才会被顾客问答检索。

管理端使用邮箱登录，顾客端使用 `/s/<store-slug>` 公开入口。数据库 RLS 按 `store_id` 隔离 owner、manager、staff 权限；销售必须通过 `record_sale` RPC 扣库存并保存价格快照。未配置 Supabase 时，只有显式 `VITE_DEMO_MODE=true`（或测试模式）才会播种本地演示数据，生产环境不会自动写入种子。

## CI 与发布

所有分支 push 和手动 `workflow_dispatch` 会生成 Web、Android debug、iOS unsigned 制品并保留 30 天；`vX.Y.Z` tag 还会校验 `package.json.version`，在签名 Secrets 齐全后创建 GitHub Release。当前移动端签名材料缺失时，正式 tag 会失败且不会创建不完整 Release。
