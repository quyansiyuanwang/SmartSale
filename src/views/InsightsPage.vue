<template>
  <ion-page class="insights-page">
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/tabs/home" /></ion-buttons>
        <ion-title>经营机会</ion-title>
        <ion-chip slot="end" color="warning">{{ insights.length }} 待行动</ion-chip>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="ion-padding">
      <section class="insight-summary">
        <p>双 Agent 协同</p>
        <h1>顾客的每个问题，都是一次经营信号。</h1>
        <span>优先处理库存紧张、重复咨询和滞销商品的转化机会。</span>
      </section>

      <section v-if="insights.length" class="insight-list" aria-label="经营建议">
        <article v-for="insight in insights" :key="insight.id" class="insight-item" :class="insight.kind">
          <div class="insight-icon"><ion-icon :icon="iconFor(insight.kind)" /></div>
          <div class="insight-copy">
            <span class="insight-kind">{{ kindLabel(insight.kind) }}</span>
            <h2>{{ insight.title }}</h2>
            <p>{{ insight.detail }}</p>
          </div>
          <div class="insight-actions">
            <ion-button size="small" :color="insight.kind === 'promotion' ? 'warning' : 'primary'" @click="handleInsight(insight)">
              {{ insight.actionLabel }}
            </ion-button>
            <ion-button v-if="insight.kind === 'restock'" size="small" fill="outline" color="danger" @click="goRestock">
              去补货
            </ion-button>
          </div>
        </article>
      </section>

      <section v-else class="insight-empty">
        <ion-icon :icon="checkmarkCircle" />
        <h2>暂时没有待跟进的机会</h2>
        <p>顾客端产生新咨询后，智店管家会在这里给出下一步建议。</p>
        <ion-button :router-link="customerEntry" fill="outline">进入顾客端体验</ion-button>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { onIonViewWillEnter } from '@ionic/vue';
import { alertController, IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonChip, IonContent, IonIcon, IonButton } from '@ionic/vue';
import { chatbubbleEllipses, checkmarkCircle, pricetag, warning } from 'ionicons/icons';
import type { BusinessInsight } from '@/types';
import { businessInsights } from '@/services/insight.service';
import { markQueriesFollowed } from '@/services/query.service';
import { createPromotion } from '@/services/promotion.service';
import { loadAll } from '@/services/data';
import { showToast } from '@/composables/useToast';
import { useAuth } from '@/composables/useAuth';
import { isDemoMode } from '@/lib/supabase';
import { publicStoreUrl } from '@/lib/platform-config';

const router = useRouter();
const insights = computed(() => businessInsights());
const { currentStore } = useAuth();
const customerEntry = computed(() => isDemoMode ? '/s/demo-store' : publicStoreUrl(currentStore.value?.slug || ''));

function goRestock() {
  void router.push('/alerts');
}

function iconFor(kind: BusinessInsight['kind']) {
  return kind === 'restock' ? warning : kind === 'promotion' ? pricetag : chatbubbleEllipses;
}

function kindLabel(kind: BusinessInsight['kind']): string {
  return kind === 'restock' ? '补货优先' : kind === 'promotion' ? '转化机会' : '需求跟进';
}

async function handleInsight(insight: BusinessInsight) {
  if (insight.kind !== 'promotion') {
    await markQueriesFollowed(insight.queryIds);
    await showToast('已标记为完成跟进', 'success');
    return;
  }
  const dialog = await alertController.create({
    header: '公开促销',
    message: `将为「${insight.productName}」创建并立即公开一条促销。`,
    buttons: [
      { text: '取消', role: 'cancel' },
      { text: '确认创建', handler: () => { void publishPromotion(insight); } }
    ]
  });
  await dialog.present();
}

async function publishPromotion(insight: BusinessInsight) {
  try {
    await createPromotion({
      title: `${insight.productName} · 顾客推荐`,
      detail: '顾客咨询热门商品，到店向店员询问可享专属优惠。',
      active: true
    });
    await markQueriesFollowed(insight.queryIds);
    await showToast('促销已公开到顾客端', 'success');
  } catch (error) {
    await showToast(error instanceof Error ? error.message : '促销创建失败', 'danger');
  }
}

onIonViewWillEnter(() => { void loadAll(); });
</script>
