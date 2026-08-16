# 智售引擎（Smart Sale）

> AI 赋能传统小微零售的轻量化改造 · MVP
> Ionic 8 + Vue 3 + TypeScript + Capacitor · Web/PWA 优先，数据本地优先

「智售引擎」首期 MVP 包含两个入口，同一份本地数据、同一条业务闭环：

- **智店管家（商家端）**：经营概览、商品管理、销售录入（自动扣库存）、库存预警、滞销分析、周经营报表、语音指令、顾客需求看板、AI 配置。
- **智购顾问（买家端）**：扫码即用入口、找货问答（货架/价格/替代品）、知识库问答、场景化清单推荐（装修/开学文具/家庭药箱/百元工具）、当前促销展示。

买家咨询（找货/问答）会实时写入商家「顾客需求」看板，形成「录入销售 → 库存变化 → 顾客问答 → 商家响应」的完整闭环。

---

## 快速开始

```bash
# 安装依赖（需要 Node 18+）
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

### Capacitor（Android 后续）

```bash
# 本机安装 Android SDK 后执行（当前 MVP 未执行原生构建）
npx cap add android
npx cap open android
```

`capacitor.config.ts` 已配置 `appId=com.smartsale.app`、`appName=智售引擎`。

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
- Android / iOS 原生构建未执行：本机无 Android SDK，iOS 需 macOS；Web 产物与 Capacitor 配置已就绪，安装 SDK 后 `npx cap add android` 即可继续。

## 文档

- 立项依据 / 双 Agent 方案详见 `goal/` 目录。
