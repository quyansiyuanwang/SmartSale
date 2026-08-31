<template>
  <ion-page class="buyer-page">
    <ion-header translucent>
      <ion-toolbar color="primary">
        <ion-title>{{ storeProfile.name }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="isDemo" router-link="/demo" color="light">返回演示</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="publicStoreStatus === 'suspended'" class="public-status"><ion-icon :icon="pauseCircle" /><h2>门店服务暂时不可用</h2><p>请联系门店工作人员，或稍后再试。</p></div>
      <div v-else-if="publicStoreStatus === 'not-found'" class="public-status"><ion-icon :icon="alertCircle" /><h2>未找到此门店</h2><p>请确认二维码或公开链接是否正确。</p></div>
      <div v-else-if="publicStoreStatus === 'invalid-token'" class="public-status"><ion-icon :icon="alertCircle" /><h2>顾客入口已失效</h2><p>请扫描门店最新二维码进入，直接输入门店地址无法访问。</p></div>
      <template v-else>
      <div class="buyer-hero">
        <h2>{{ storeProfile.welcome }}</h2>
        <ion-chip v-for="tip in tips" :key="tip" outline color="light" @click="quickAsk(tip)">
          {{ tip }}
        </ion-chip>
      </div>

      <section class="buyer-catalog" aria-label="商品浏览">
        <div class="buyer-section-head"><h2>店内商品</h2><span>{{ visibleProducts.length }} 项</span></div>
        <ion-searchbar v-model="productSearch" placeholder="搜索商品、分类或货架" />
        <div class="buyer-category-row" aria-label="商品分类筛选">
          <button type="button" class="buyer-cat" :class="{ active: activeCategory === 'all' }" @click="activeCategory = 'all'">全部</button>
          <button v-for="c in categories" :key="c" type="button" class="buyer-cat" :class="{ active: activeCategory === c }" @click="activeCategory = c">{{ c }}</button>
        </div>
        <div class="buyer-product-grid">
          <button v-for="product in visibleProducts" :key="product.id" type="button" class="buyer-product" :class="{ soldout: product.stock <= 0 }" @click="quickAsk(`${product.name}在哪里？`)">
            <span class="buyer-product-category">{{ product.category }}</span>
            <strong>{{ product.name }}</strong>
            <span class="buyer-product-desc">{{ product.desc }}</span>
            <small>{{ product.location }} 货架 · {{ product.stock <= 0 ? '暂时缺货' : `库存 ${product.stock} 件` }}</small>
            <b>{{ formatMoney(product.price) }}</b>
          </button>
        </div>
        <p v-if="!visibleProducts.length" class="buyer-catalog-empty">没有找到对应商品，直接向智购顾问提问吧。</p>
      </section>

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
        <div ref="chatEnd" />
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
        <div>{{ storeProfile.hours }} · <a class="store-tel" :href="`tel:${storeProfile.phone}`">{{ storeProfile.phone }}</a></div>
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
import { computed, nextTick, ref } from 'vue';
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonChip, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonFooter, IonItem,
  IonInput, IonNote, IonSpinner } from '@ionic/vue';
import { mic, stop, refresh, send as sendIcon, pricetag, pauseCircle, alertCircle } from 'ionicons/icons';
import { products, storeProfile, promotions, loadPublicStore, publicStoreStatus } from '@/services/data';
import { runBuyerWorkflow } from '@/services/agent-orchestrator.service';
import { useSpeech } from '@/composables/useSpeech';
import { isDemoMode } from '@/lib/supabase';
import { rememberPublicStore } from '@/lib/platform-config';

const tips = ['16mm膨胀螺丝在哪？', '水龙头怎么安装？', '开学文具清单', '100元以内工具箱', '家庭应急药箱'];
const route = useRoute();
const input = ref('');
const thinking = ref(false);
const productSearch = ref('');
const chatEnd = ref<HTMLElement | null>(null);
let chatController: AbortController | null = null;
const msgs = ref<Array<{ role: 'user' | 'assistant'; text: string; source?: string }>>([]);
const isDemo = isDemoMode;

const activePromos = computed(() => promotions.value.filter((p) => p.active));
const activeCategory = ref('all');
const categories = computed(() => [...new Set(products.value.filter((product) => product.published !== false).map((product) => product.category))]);
const visibleProducts = computed(() => {
  const keyword = productSearch.value.trim().toLocaleLowerCase();
  return products.value
    .filter((product) => product.published !== false)
    .filter((product) => activeCategory.value === 'all' || product.category === activeCategory.value)
    .filter((product) => !keyword || [product.name, product.category, product.location, product.desc].some((value) => value.toLocaleLowerCase().includes(keyword)));
});

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
  await scrollToLatest();
  input.value = '';
  thinking.value = true;
  chatController = new AbortController();
  try {
    const history = msgs.value.slice(0, -1).slice(-6).map(({ role, text }) => ({ role, text }));
    const { result: reply } = await runBuyerWorkflow(q, chatController.signal, history);
    msgs.value.push({ role: 'assistant', text: reply.text, source: reply.source });
  } catch (error) {
    if ((error as DOMException)?.name !== 'AbortError') msgs.value.push({ role: 'assistant', text: error instanceof Error ? error.message : 'AI 服务暂不可用', source: 'error' });
  } finally {
    chatController = null;
    thinking.value = false;
    await scrollToLatest();
  }
}

async function scrollToLatest() {
  await nextTick();
  chatEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function sourceTag(src?: string): string {
  if (src === 'ai') return isDemo ? 'AI 在线 · 演示数据' : '平台 AI';
  if (src === 'error') return '服务提示';
  return '本地规则';
}

function formatMoney(amount: number): string { return `¥${amount.toFixed(2)}`; }

function lineBreak(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
}

onMounted(async () => {
  const slug = typeof route.params.slug === 'string' ? route.params.slug : new URLSearchParams(window.location.search).get('store');
  const token = new URLSearchParams(window.location.search).get('token') || undefined;
  if (!slug) {
    publicStoreStatus.value = 'invalid-token';
    msgs.value.push({ role: 'assistant', text: '请扫描门店最新二维码进入，缺少门店和访问令牌。', source: 'error' });
  } else if (slug && !token) {
    publicStoreStatus.value = 'invalid-token';
    msgs.value.push({ role: 'assistant', text: '请扫描门店最新二维码进入，直接输入门店地址无法访问。', source: 'error' });
  } else if (slug) {
    rememberPublicStore(slug);
    try { await loadPublicStore(slug, token); } catch (error) { msgs.value.push({ role: 'assistant', text: error instanceof Error ? error.message : '门店信息暂不可用', source: 'error' }); }
  }
});
</script>
