<template>
  <ion-page class="architecture-page">
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/tabs/more" /></ion-buttons>
        <ion-title>系统架构演示</ion-title>
        <ion-chip slot="end" :color="isDemo ? 'warning' : 'success'" class="mode-chip">
          <ion-icon :icon="isDemo ? flask : cloud" />
          <ion-label>{{ isDemo ? '本地 Demo' : '云端链路' }}</ion-label>
        </ion-chip>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <main class="architecture-shell">
        <section class="architecture-hero">
          <div>
            <p class="architecture-eyebrow">SMART SALE / AGENT CONTROL ROOM</p>
            <h1>端云协同，<span>让每一次问答都可追踪。</span></h1>
            <p class="architecture-lede">用一条可复现的工作流，把智店管家、智购顾问与云端五个核心模块串成完整零售闭环。</p>
          </div>
          <div class="hero-actions">
            <ion-button color="warning" @click="runBuyerDemo" :disabled="running">
              <ion-icon slot="start" :icon="chatbubbleEllipses" />演示顾客问答
            </ion-button>
            <ion-button fill="outline" color="light" @click="runMerchantDemo" :disabled="running">
              <ion-icon slot="start" :icon="pulse" />演示经营指令
            </ion-button>
          </div>
        </section>

        <section class="metric-row" aria-label="系统指标">
          <div class="metric-tile"><span>最近运行</span><strong>{{ activeRun ? activeRun.events.length : 0 }}</strong><small>个工作流节点</small></div>
          <div class="metric-tile"><span>知识命中</span><strong>{{ knowledgeHits.length }}</strong><small>商品 / 文档 / 图谱</small></div>
          <div class="metric-tile"><span>协同状态</span><strong class="metric-online">{{ collaborationStatus }}</strong><small>双 Agent 事件总线</small></div>
          <div class="metric-tile"><span>端侧覆盖</span><strong>4</strong><small>Android · iOS · 鸿蒙 · Web</small></div>
        </section>

        <section class="architecture-map" aria-label="云端与端侧架构">
          <div class="map-heading"><div><p class="section-kicker">01 / CLOUD SERVICE LAYER</p><h2>云端服务层</h2></div><span>双向数据交互</span></div>
          <div class="cloud-grid">
            <div v-for="module in cloudModules" :key="module.id" class="module-node" :class="{ active: activeModules.has(module.id) }">
              <div class="module-index">0{{ module.index }}</div>
              <ion-icon :icon="module.icon" />
              <div class="module-copy"><strong>{{ module.title }}</strong><small>{{ module.description }}</small></div>
              <span class="node-state">{{ activeModules.has(module.id) ? 'RUNNING' : 'READY' }}</span>
            </div>
          </div>
          <div class="data-bridge"><span class="bridge-line" /><span>双向数据交互 · API / 事件 / 状态同步</span><span class="bridge-line" /></div>
          <div class="edge-layer">
            <div class="agent-card storekeeper-agent">
              <div class="agent-mark"><ion-icon :icon="storefront" /></div>
              <div><p>端侧应用 / B 端</p><h3>智店管家</h3><span>库存 · 经营 · 报表 · 语音</span></div>
              <ion-icon class="agent-arrow" :icon="arrowForward" />
            </div>
            <div class="agent-card advisor-agent">
              <div class="agent-mark"><ion-icon :icon="sparkles" /></div>
              <div><p>端侧应用 / C 端</p><h3>智购顾问</h3><span>问答 · 推荐 · 多模态</span></div>
              <ion-icon class="agent-arrow" :icon="arrowForward" />
            </div>
          </div>
          <div class="codebase-strip"><ion-icon :icon="codeSlash" /><div><strong>全平台统一代码库</strong><span>Vue 3 + Ionic + Capacitor · 一套代码多端部署</span></div><div class="platform-pills"><span>Android</span><span>iOS</span><span>鸿蒙</span><span>Web</span></div></div>
        </section>

        <section class="trace-grid">
          <div class="trace-panel">
            <div class="panel-heading"><div><p class="section-kicker">02 / LIVE TRACE</p><h2>最近一次工作流</h2></div><span v-if="activeRun" class="run-id">{{ activeRun.id }}</span></div>
            <div v-if="activeRun" class="run-summary"><span :class="['agent-badge', activeRun.agent]">{{ activeRun.agent === 'shopping-advisor' ? '智购顾问' : '智店管家' }}</span><strong>{{ activeRun.input }}</strong><small>{{ formatTime(activeRun.createdAt) }}</small></div>
            <div v-if="events.length" class="event-list">
              <div v-for="event in events" :key="event.id" class="event-row">
                <div class="event-dot" :class="event.status" />
                <div class="event-body"><div><strong>{{ event.action }}</strong><span class="event-module">{{ moduleTitle(event.module) }}</span></div><small>{{ event.detail || '等待执行' }}</small></div>
                <span class="event-time">{{ event.durationMs ?? 0 }}ms</span>
              </div>
            </div>
            <div v-else class="trace-empty"><ion-icon :icon="radio" /><p>点击上方任一演示按钮，观察 Agent 调度轨迹。</p></div>
          </div>

          <div class="knowledge-panel">
            <div class="panel-heading"><div><p class="section-kicker">03 / KNOWLEDGE ENGINE</p><h2>知识命中</h2></div><span class="hit-count">{{ knowledgeHits.length }} HITS</span></div>
            <div v-if="knowledgeHits.length" class="hit-list">
              <div v-for="hit in knowledgeHits" :key="hit.id" class="hit-row"><span class="hit-kind" :class="hit.kind">{{ hit.kind === 'product' ? '商品' : hit.kind === 'document' ? '文档' : '图谱' }}</span><div><strong>{{ hit.title }}</strong><p>{{ hit.content }}</p></div><span class="hit-score">{{ Math.round(hit.score * 100) }}%</span></div>
            </div>
            <div v-else class="trace-empty"><ion-icon :icon="layers" /><p>知识引擎会在顾客问答运行后展示商品、文档与图谱关系。</p></div>
          </div>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonChip, IonIcon, IonLabel, IonContent, IonButton } from '@ionic/vue';
import { arrowForward, bulb, chatbubbleEllipses, cloud, codeSlash, flask, layers, pulse, radio, server, sparkles, storefront, gitNetwork } from 'ionicons/icons';
import { isDemoMode } from '@/lib/supabase';
import { latestWorkflowRun, runBuyerWorkflow, runStorekeeperWorkflow, workflowEvents, workflowKnowledge } from '@/services/agent-orchestrator.service';
import type { CloudModule } from '@/types';

const running = ref(false);
const isDemo = isDemoMode;
const activeRun = computed(() => latestWorkflowRun.value);
const events = computed(() => workflowEvents(activeRun.value));
const knowledgeHits = computed(() => activeRun.value?.agent === 'shopping-advisor' ? workflowKnowledge(activeRun.value.input) : []);
const activeModules = computed(() => new Set(events.value.map((event) => event.module)));
const collaborationStatus = computed(() => events.value.some((event) => event.module === 'collaboration-center' && event.status === 'success') ? 'SYNCED' : 'READY');

const cloudModules: Array<{ id: CloudModule; index: number; title: string; description: string; icon: typeof server }> = [
  { id: 'llm-gateway', index: 1, title: '大模型 API 网关', description: '统一转发与降级', icon: cloud },
  { id: 'workflow-engine', index: 2, title: 'Agent 工作流引擎', description: '编排业务任务', icon: gitNetwork },
  { id: 'knowledge-engine', index: 3, title: '行业知识引擎', description: 'RAG + 轻量图谱', icon: bulb },
  { id: 'relational-db', index: 4, title: '关系型数据库', description: '商品与经营数据', icon: server },
  { id: 'collaboration-center', index: 5, title: '双 Agent 协同中心', description: '事件调度与同步', icon: pulse }
];

async function runBuyerDemo() {
  if (running.value) return;
  running.value = true;
  try { await runBuyerWorkflow('水龙头怎么安装'); } finally { running.value = false; }
}

async function runMerchantDemo() {
  if (running.value) return;
  running.value = true;
  try { await runStorekeeperWorkflow('查胶带库存'); } finally { running.value = false; }
}

function moduleTitle(module: CloudModule): string {
  return cloudModules.find((item) => item.id === module)?.title ?? module;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
</script>
