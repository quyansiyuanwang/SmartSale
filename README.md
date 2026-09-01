# 智售引擎（Smart Sale）

> AI 赋能传统小微零售的轻量化改造 · MVP
> Ionic 8 + Vue 3 + TypeScript + Capacitor · Web/PWA 优先，Supabase 多租户生产架构

「智售引擎」首期 MVP 包含两个入口，同一份本地数据、同一条业务闭环：

- **智店管家（商家端）**：Android App/PWA 管理后台，提供开店引导清单、经营概览、商品管理（含“已发布”上架开关）、销售录入（相机扫码 / 条码回车即录 / 语音填入）、库存预警（含语音播报补货提醒）、经营报表（本周/上周）、滞销一键 9 折促销、促销启停管理、知识库资料管理（上传/发布顾客问答资料）和顾客需求看板。
- **智购顾问（买家端）**：扫码即用入口、找货问答（货架/价格/替代品）、知识库问答、场景化清单推荐（装修/开学文具/家庭药箱/百元工具）、商品目录（分类筛选、库存、描述与缺货标识）、当前促销展示与一键拨号联系门店。

买家咨询（找货/问答）会实时写入商家「顾客需求」看板，形成「录入销售 → 库存变化 → 顾客问答 → 商家响应」的完整闭环。

---

## 快速开始

```bash
# 安装依赖（需要 Node 22）
npm install

# 本地开发（浏览器访问 http://localhost:5173）
npm run dev

# 本机竞赛 Demo（局域网设备也可访问，不需要 Supabase 或 AI Key）
npm run demo

# 运行单元测试
npm test

# 生产构建（vue-tsc 类型检查 + vite 打包，生成 PWA 产物）
npm run build

# 预览生产构建
npm run preview

# 同步 Capacitor 原生配置（Web 与原生项目共享配置）
npx cap sync
```

### 云端门店服务

生产版本由平台统一托管 Supabase，不需要商家填写数据库地址或 AI Key。商家打开 PWA 后使用邮箱注册，首次登录会创建门店并进入初始化向导；后台设置页可以查看动态顾客二维码、暂停公开服务，以及下载 CSV 模板批量导入商品。

顾客二维码地址为 `https://app.<正式域名>/s/<store-slug>?token=<random-token>`。顾客无需登录即可查看该门店公开商品、价格、促销并进行售前问答；没有令牌、令牌已刷新或过期时无法访问。门店暂停后有效二维码仍可打开，但只显示服务暂停页。

平台部署需要在 GitHub Actions 的 `development` 和 `production` Environment 配置：

| 类型 | 名称 | 用途 |
| --- | --- | --- |
| Variables | `VITE_SUPABASE_URL` | 前端连接对应 Supabase 项目 |
| Variables | `VITE_SUPABASE_ANON_KEY` | 前端公开 anon key |
| Variables | `VITE_APP_PUBLIC_BASE_URL` | 二维码和公开链接的正式域名 |
| Secrets | `SUPABASE_ACCESS_TOKEN` | Supabase CLI 部署授权 |
| Secrets | `SUPABASE_PROJECT_REF` | 对应环境的 Supabase 项目 ID |

Supabase Function Secrets 只在云端配置 `DEEPSEEK_API_KEY`、Embedding Provider 配置和 `SUPABASE_SERVICE_ROLE_KEY`。商家设备不保存供应商密钥。执行 `.github/workflows/supabase.yml` 的手动工作流会依次应用 migration、部署 Functions 并检查公开 API。

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
│  │  ├─ knowledge.service.ts # 本地知识检索（商品/文档/图谱）
│  │  ├─ knowledge-admin.service.ts # 知识库上传/发布/删除（云端）
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

## AI 服务

生产环境的顾客问答经 Supabase `ai-chat` Edge Function 调用平台托管模型，供应商 Key 只保存在 Function Secrets。商家 App 和顾客浏览器均不保存模型 Key。

`npm run demo` 默认使用本地规则导购。复制 `.env.demo.local.example` 为 `.env.demo.local` 并填写 `DEMO_AI_*` 后，Demo 会通过本机 Vite 代理接入真实 AI；密钥不会进入浏览器包，调用失败时自动回退规则回答。

### 支持的语音指令（Web Speech API，Chrome/Edge）

- `查胶带库存`
- `改胶带价格为 5`（不带金额时，如「改胶带价格」，会追问具体改成多少钱）
- `本周热销` / `上周热销` / `周报`
- 浏览器不支持语音时自动隐藏语音按钮。

### 语音播报补货提醒（Web Speech Synthesis）

- 录入销售使库存降到安全库存及以下时，销售页会弹出危险提示并用语音播报「XX 库存不足，请及时补货」。
- 「库存预警」页提供「语音播报」按钮，一键读出当前全部预警商品（浏览器不支持时自动隐藏）。

### 相机扫码录入销售（BarcodeDetector，无需扫码枪）

- 销售页提供扫码按钮：调用浏览器原生 `BarcodeDetector` + 后置相机，识别条码后自动选中已建档商品；未建档条码会填入搜索框提示。
- 需要浏览器支持 `BarcodeDetector` 且页面处于 HTTPS（或本机 localhost）环境；不满足时按钮自动隐藏，可回退条码手动输入/回车即录。

### 开店引导（降低商家接入门槛）

- 新商家登录后，首页按门店状态显示「开店引导」清单：完善门店资料 → 录入第一个商品（支持 CSV 批量导入）→ 录入第一笔销售；每步可点击直达对应页面，全部完成后自动隐藏，不打扰日常使用。

### 知识库资料管理（云端）

- 商家在「门店服务设置」上传 PDF/DOCX/TXT/Markdown 资料（单文件 ≤ 10 MB），系统自动切片并向量化；「发布」后顾客售前问答即会检索引用，未发布或已撤回的文档不影响问答。

---

## 验收基线

- [x] 种子数据可重置（更多 → 重置演示数据）
- [x] 销售录入自动扣库存，低于安全库存出现预警；支持语音播报补货提醒（Vitest 断言 `lowStockProduct`）
- [x] 周报（热销 / 滞销 / 利润）计算正确（Vitest 固定种子断言），支持本周/上周切换
- [x] 买家问答（Mock / AI）可用，且问题实时出现在商家「顾客需求」看板
- [x] 滞销商品可一键生成 9 折公开促销；促销可在设置页启停并实时同步顾客端
- [x] 商品支持“已发布”开关，未发布商品不出现在顾客端
- [x] 顾客端支持分类筛选、缺货标识与一键拨号；商家首页含开店引导清单（Vitest 覆盖状态推导）
- [x] `npm run build` 通过；PWA 可安装
- [x] 无 Key 时「演示模式」标识正确；演示模式可切换“公开售前服务”体验暂停页

### 测试

```bash
npm test   # Vitest：存储 CRUD/种子重置、扣库存与预警、周报/滞销、AI 降级
```

---

## 已知限制（MVP）

- 商家通过 Supabase Auth 登录，数据按门店 RLS 隔离；多员工切换、会员和支付不在本次范围。
- 本机 Demo 使用 Capacitor Preferences；生产数据使用 Supabase Postgres、Auth、Storage 与 Edge Functions。
- 买家端以 Web/PWA 替代微信小程序（Capacitor 不支持小程序）。
- 鸿蒙设备可通过浏览器/PWA 访问统一 Web 代码；本 Demo 不包含独立鸿蒙原生工程。
- Android / iOS 原生包由 GitHub Actions 构建：Android 使用 Ubuntu runner，iOS 使用 macOS runner；本地 iOS 构建仍需 macOS 与 Xcode。

## 文档

- 部署、配置、商家与顾客入口、运维和发布说明见 [docs/README.md](docs/README.md)。
- 立项依据 / 双 Agent 方案详见 `goal/` 目录。
