<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/tabs/home" /></ion-buttons>
        <ion-title>顾客咨询</ion-title>
        <ion-buttons slot="end">
          <ion-button color="danger" @click="clearAll">清空</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-list>
        <ion-item v-for="q in list" :key="q.id" lines="full">
          <ion-label class="ion-padding-vertical">
            <div class="q-head">
              <h2>{{ q.content }}</h2>
              <ion-badge :color="q.demo ? 'warning' : 'primary'" size="small">
                {{ q.demo ? '演示模式' : 'AI 在线' }}
              </ion-badge>
            </div>
            <p class="q-answer">{{ q.answer }}</p>
            <p class="q-time">{{ fullText(q.createdAt) }}</p>
          </ion-label>
        </ion-item>
        <ion-item v-if="!list.length">
          <ion-label class="ion-text-center">暂无顾客咨询，去「顾客端」体验问答吧</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonBadge } from '@ionic/vue';
import { listQueries, clearQueries } from '@/services/query.service';
import { showToast } from '@/composables/useToast';

const list = ref(listQueries());

async function clearAll() {
  await clearQueries();
  list.value = [];
  await showToast('已清空咨询记录');
}

function fullText(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onIonViewWillEnter(() => {
  list.value = listQueries();
});
</script>
