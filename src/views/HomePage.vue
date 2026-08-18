<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-title>{{ storeProfile.name }}</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/buyer" color="primary">
            <ion-icon slot="start" :icon="storefront" />
            顾客端
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="greet-card">
        <div class="greet-title">智店管家</div>
        <div class="greet-sub">{{ todayText }} · {{ storeProfile.hours }}</div>
      </div>

      <ion-grid class="stat-grid">
        <ion-row>
          <ion-col size="6"><div class="stat-card"><div class="stat-num">{{ fmt(today.revenue) }}</div><div class="stat-label">今日销售额</div></div></ion-col>
          <ion-col size="6"><div class="stat-card"><div class="stat-num">{{ today.count }} 件</div><div class="stat-label">今日销量</div></div></ion-col>
          <ion-col size="6"><div class="stat-card" :class="{ warn: lowList.length }"><div class="stat-num">{{ lowList.length }}</div><div class="stat-label">库存预警</div></div></ion-col>
          <ion-col size="6"><div class="stat-card"><div class="stat-num">{{ todayQueries.length }}</div><div class="stat-label">今日顾客咨询</div></div></ion-col>
        </ion-row>
      </ion-grid>

      <div class="quick-actions">
        <ion-button expand="block" router-link="/tabs/sales" color="primary">
          <ion-icon slot="start" :icon="addCircle" />录入销售
        </ion-button>
        <ion-button expand="block" fill="outline" router-link="/buyer">
          <ion-icon slot="start" :icon="chatbubbles" />进入智购顾问
        </ion-button>
      </div>

      <ion-card button router-link="/alerts" v-if="lowList.length">
        <ion-card-header>
          <ion-card-title><ion-icon :icon="warning" color="danger" /> 库存预警</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="full" class="no-pad">
            <ion-item v-for="p in lowList" :key="p.id">
              <ion-label>
                <h2>{{ p.name }}</h2>
                <p>{{ p.category }} · {{ p.location }} 货架</p>
              </ion-label>
              <ion-badge color="danger" slot="end">剩 {{ p.stock }}/安全 {{ p.safeStock }}</ion-badge>
            </ion-item>
          </ion-list>
          <div class="more-link">查看全部预警 →</div>
        </ion-card-content>
      </ion-card>

      <ion-card button router-link="/queries" v-if="todayQueries.length">
        <ion-card-header>
          <ion-card-title><ion-icon :icon="chatbubbleEllipses" color="primary" /> 最新顾客咨询</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item v-for="q in todayQueries.slice(0, 3)" :key="q.id" lines="inset">
            <ion-label>
              <h2>{{ q.content }}</h2>
              <p class="tiny">{{ timeText(q.createdAt) }}{{ q.demo ? ' · 演示模式回复' : ' · AI 在线回复' }}</p>
            </ion-label>
          </ion-item>
          <div class="more-link">查看全部咨询 →</div>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>经营小贴士</ion-card-title>
        </ion-card-header>
        <ion-card-content class="tip-text">
          每周一用「报表」页生成上周经营周报；语音试试「查胶带库存」「改胶带价格为 5」。
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge } from '@ionic/vue';
import { storefront, addCircle, chatbubbles, warning, chatbubbleEllipses } from 'ionicons/icons';
import { storeProfile, queries } from '@/services/data';
import { todaySummary, lowStock } from '@/services/report.service';
import { todaySales } from '@/services/sale.service';

const today = computed(() => todaySummary());
const lowList = computed(() => lowStock());
const todayQueries = computed(() => queries.value.filter((q) => {
  const d = new Date(q.createdAt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}));

function todayText(): string {
  const d = new Date();
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 星期${['日','一','二','三','四','五','六'][d.getDay()]}`;
}
function fmt(n: number): string {
  return n === 0 ? '¥0' : `¥${n.toFixed(1)}`;
}
function timeText(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

onIonViewWillEnter(() => {
  void todaySales();
});
</script>
