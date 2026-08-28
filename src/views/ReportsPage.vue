<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-title>经营报表</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-card class="weekly-card">
        <ion-card-header>
          <ion-card-title>经营周报</ion-card-title>
          <ion-card-subtitle>{{ weekLabel }}</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-segment v-model="weekScope" class="week-segment" aria-label="周报统计范围">
            <ion-segment-button value="this"><ion-label>本周</ion-label></ion-segment-button>
            <ion-segment-button value="last"><ion-label>上周</ion-label></ion-segment-button>
          </ion-segment>
          <ion-grid>
            <ion-row>
              <ion-col size="4"><div class="mini-stat"><div class="num">{{ fmtMoney(summary.revenue) }}</div><div class="label">营业额</div></div></ion-col>
              <ion-col size="4"><div class="mini-stat"><div class="num">{{ summary.count }} 件</div><div class="label">销量</div></div></ion-col>
              <ion-col size="4"><div class="mini-stat"><div class="num">{{ fmtMoney(summary.profit) }}</div><div class="label">毛利</div></div></ion-col>
            </ion-row>
          </ion-grid>
          <ion-list lines="inset" class="no-pad">
            <ion-item>
              <ion-label class="item-head"><b>热销 TOP{{ report.top.length }}</b></ion-label>
            </ion-item>
            <ion-item v-for="(t, i) in report.top" :key="t.productId">
              <ion-label>
                <h2>{{ i + 1 }}. {{ t.name }}</h2>
                <p>销量 {{ t.qty }} 件 · 销售额 {{ fmtMoney(t.amount) }} · 毛利 {{ fmtMoney(t.profit) }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="item-head"><b>滞销商品（14 天无销量）</b></ion-label>
            </ion-item>
            <ion-item v-for="p in report.slow" :key="p.id">
              <ion-label>
                <h2>{{ p.name }} <ion-badge color="warning">剩 {{ p.stock }} 件</ion-badge></h2>
                <p>建议：降价 10% 或与热销品捆绑促销</p>
              </ion-label>
              <ion-button slot="end" size="small" fill="outline" color="warning" @click="createSlowPromotion(p)">生成 9 折促销</ion-button>
            </ion-item>
            <ion-item v-if="!report.slow.length">
              <ion-label class="ion-text-center">暂无滞销商品，表现不错 👏</ion-label>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>语音 / 文字指令</ion-card-title>
          <ion-card-subtitle>试试「查扳手库存」「改胶带价格为 5」「本周报表」</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="cmd-row">
            <ion-input v-model="cmdText" placeholder="输入或按住麦克风说话" class="cmd-input" @keyup.enter="runCommand" />
            <ion-button v-if="speechSupported" shape="round" :color="listening ? 'danger' : speechIsError ? 'warning' : 'primary'" @click="toggleMic">
              <ion-icon slot="icon-only" :icon="listening ? stop : speechIsError ? refresh : mic" />
            </ion-button>
            <ion-button shape="round" color="success" @click="runCommand">
              <ion-icon slot="icon-only" :icon="send" />
            </ion-button>
          </div>
          <ion-note v-if="listening" class="listening-note">正在聆听，点击停止取消…（{{ transcript }}）</ion-note>
          <ion-note v-else-if="speechError" color="danger" class="listening-note">{{ speechError }}</ion-note>
          <div v-if="cmdResult" class="cmd-result">
            <ion-icon :icon="cmdResult.source === 'command' ? terminal : bulb" />
            <div>
              <span class="result-tag">{{ sourceTag(cmdResult.source) }}</span>
              <pre>{{ cmdResult.text }}</pre>
            </div>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader,
  IonCardTitle, IonCardSubtitle, IonCardContent, IonGrid, IonRow, IonCol, IonList, IonItem,
  IonLabel, IonBadge, IonInput, IonButton, IonIcon, IonNote, IonSegment, IonSegmentButton, alertController } from '@ionic/vue';
import { mic, stop, refresh, send, terminal, bulb } from 'ionicons/icons';
import { weeklyReport, mondayOf, fmtMoney } from '@/services/report.service';
import { createPromotion } from '@/services/promotion.service';
import { CommandResult } from '@/services/ai.service';
import { runStorekeeperWorkflow } from '@/services/agent-orchestrator.service';
import { useSpeech } from '@/composables/useSpeech';
import { showToast } from '@/composables/useToast';
import { Product } from '@/types';

const weekScope = ref<'this' | 'last'>('this');
const report = ref(weeklyReport());
const summary = computed(() => report.value.summary);
const weekLabel = computed(() => {
  const f = new Date(report.value.from);
  const t = new Date(new Date(report.value.to).getTime() - 1);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(f)} - ${fmt(t)}`;
});

function refreshReport() {
  const reference = weekScope.value === 'last'
    ? new Date(mondayOf(new Date()).getTime() - 7 * 24 * 3600 * 1000)
    : new Date();
  report.value = weeklyReport(reference);
}

watch(weekScope, refreshReport);

async function createSlowPromotion(p: Product) {
  const promoPrice = Math.max(0.1, Math.round(p.price * 0.9 * 100) / 100);
  const dialog = await alertController.create({
    header: '生成滞销促销',
    message: `将创建并公开促销：「${p.name}」限时 9 折，${fmtMoney(p.price)} → ${fmtMoney(promoPrice)}。`,
    buttons: [
      { text: '取消', role: 'cancel' },
      { text: '确认创建', handler: () => { void publishSlowPromotion(p, promoPrice); } }
    ]
  });
  await dialog.present();
}

async function publishSlowPromotion(p: Product, promoPrice: number) {
  try {
    await createPromotion({
      title: `${p.name} · 限时 9 折`,
      detail: `滞销清仓：原价 ${fmtMoney(p.price)}，促销价 ${fmtMoney(promoPrice)}，进店即可享受。`,
      active: true
    });
    await showToast('滞销促销已公开到顾客端', 'success');
  } catch (error) {
    await showToast(error instanceof Error ? error.message : '促销创建失败', 'danger');
  }
}

const cmdText = ref('');
const cmdResult = ref<CommandResult['reply'] | null>(null);
const { supported: speechSupported, listening, isError: speechIsError, transcript, error: speechError, start: startSpeech, stop: stopSpeech, reset: resetSpeech } = useSpeech((text) => {
  cmdText.value = text;
  void runCommand();
});

function toggleMic() {
  if (listening.value) stopSpeech();
  else { resetSpeech(); startSpeech(); }
}

async function runCommand() {
  const text = cmdText.value.trim();
  if (!text) return;
  const { result: res } = await runStorekeeperWorkflow(text);
  cmdResult.value = res.reply;
  cmdText.value = '';
  if (res.changed) await showToast('价格已更新', 'success');
}

function sourceTag(src?: string): string {
  if (src === 'command') return '本地指令';
  if (src === 'ai') return 'AI 在线';
  return '演示模式';
}

onIonViewWillEnter(() => {
  refreshReport();
});
</script>
