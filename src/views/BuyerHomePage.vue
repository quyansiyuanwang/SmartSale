<template>
  <ion-page class="buyer-page">
    <ion-header translucent>
      <ion-toolbar color="primary">
        <ion-title>{{ storeProfile.name }}</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/tabs/home" color="light">返回管理端</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="publicStoreStatus === 'suspended'" class="public-status"><ion-icon :icon="pauseCircle" /><h2>门店服务暂时不可用</h2><p>请联系门店工作人员，或稍后再试。</p></div>
      <div v-else-if="publicStoreStatus === 'not-found'" class="public-status"><ion-icon :icon="alertCircle" /><h2>未找到此门店</h2><p>请确认二维码或公开链接是否正确。</p></div>
      <template v-else>
      <div class="buyer-hero">
        <h2>👋 {{ storeProfile.welcome }}</h2>
        <ion-chip v-for="tip in tips" :key="tip" outline color="light" @click="quickAsk(tip)">
          {{ tip }}
        </ion-chip>
      </div>

      <div class="chat-area">
        <div v-for="(m, i) in msgs" :key="i" class="msg" :class="m.role">
          <div class="bubble">
            <span v-if="m.role === 'assistant'" class="source-tag">{{ sourceTag(m.source) }}</span>
            <span class="text" v-html="lineBreak(m.text)"></span>
          </div>
        </div>
        <div v-if="thinking" class="msg assistant">
          <div class="bubble thinking"><ion-spinner name="dots" /> 智购顾问思考中…</div>
        </div>
        <div v-if="!msgs.length && !thinking" class="empty-tip">
          您可以直接提问，比如「16mm膨胀螺丝在哪」「水龙头怎么安装」「开学文具清单」。
        </div>
      </div>

      <ion-card v-if="activePromos.length" class="promo-card">
        <ion-card-header class="ion-no-padding">
          <ion-card-title><ion-icon :icon="pricetag" color="danger" /> 今日优惠</ion-card-title>
        </ion-card-header>
        <ion-card-content class="ion-no-padding">
          <div v-for="pr in activePromos" :key="pr.id" class="promo-item">
            <b>{{ pr.title }}</b> · {{ pr.detail }}
          </div>
        </ion-card-content>
      </ion-card>

      <div class="store-foot">
        <div>{{ storeProfile.address }}</div>
        <div>{{ storeProfile.hours }} · {{ storeProfile.phone }}</div>
      </div>
      </template>
    </ion-content>

    <ion-footer v-if="publicStoreStatus === 'active'" class="input-footer">
      <ion-toolbar>
        <ion-item lines="none" class="input-row">
          <ion-input v-model="input" placeholder="问问智购顾问…" @keyup.enter="send()" />
          <ion-button v-if="speechSupported" shape="round" :color="listening ? 'danger' : speechIsError ? 'warning' : 'primary'" @click="toggleMic">
            <ion-icon slot="icon-only" :icon="listening ? stop : speechIsError ? refresh : mic" />
          </ion-button>
          <ion-button shape="round" color="success" :disabled="thinking || !input.trim()" @click="send()">
            <ion-icon slot="icon-only" :icon="sendIcon" />
          </ion-button>
        </ion-item>
        <ion-note v-if="listening" color="danger" class="listen-note">正在聆听，点击停止取消…{{ transcript }}</ion-note>
        <ion-note v-else-if="speechError" color="danger" class="listen-note">{{ speechError }}，点击麦克风重试</ion-note>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonChip, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonFooter, IonItem,
  IonInput, IonNote, IonSpinner } from '@ionic/vue';
import { mic, stop, refresh, send as sendIcon, pricetag, pauseCircle, alertCircle } from 'ionicons/icons';
import { storeProfile, promotions, loadPublicStore, publicStoreStatus } from '@/services/data';
import { runBuyerWorkflow } from '@/services/agent-orchestrator.service';
import { useSpeech } from '@/composables/useSpeech';

const tips = ['16mm膨胀螺丝在哪？', '水龙头怎么安装？', '开学文具清单', '100元以内工具箱', '家庭应急药箱'];
const route = useRoute();
const input = ref('');
const thinking = ref(false);
let chatController: AbortController | null = null;
const msgs = ref<Array<{ role: 'user' | 'assistant'; text: string; source?: string }>>([]);

const activePromos = computed(() => promotions.value.filter((p) => p.active));

const { supported: speechSupported, listening, isError: speechIsError, transcript, error: speechError, start: startSpeech, stop: stopSpeech, reset: resetSpeech } = useSpeech((text) => {
  input.value = text;
  void send();
});

function quickAsk(tip: string) {
  input.value = tip;
  void send();
}

function toggleMic() {
  if (listening.value) stopSpeech();
  else { resetSpeech(); startSpeech(); }
}

async function send() {
  const q = input.value.trim();
  if (!q || thinking.value) return;
  msgs.value.push({ role: 'user', text: q });
  input.value = '';
  thinking.value = true;
  chatController = new AbortController();
  try {
    const { result: reply } = await runBuyerWorkflow(q, chatController.signal);
    msgs.value.push({ role: 'assistant', text: reply.text, source: reply.source });
  } catch (error) {
    if ((error as DOMException)?.name !== 'AbortError') msgs.value.push({ role: 'assistant', text: error instanceof Error ? error.message : 'AI 服务暂不可用', source: 'error' });
  } finally {
    chatController = null;
    thinking.value = false;
  }
}

function sourceTag(src?: string): string {
  if (src === 'ai') return 'AI 在线';
  return '演示模式';
}

function lineBreak(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
}

onMounted(async () => {
  const slug = typeof route.params.slug === 'string' ? route.params.slug : new URLSearchParams(window.location.search).get('store');
  if (slug) { try { await loadPublicStore(slug); } catch (error) { msgs.value.push({ role: 'assistant', text: error instanceof Error ? error.message : '门店信息暂不可用', source: 'error' }); } }
});
</script>
