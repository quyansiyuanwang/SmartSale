<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-title>我的</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="profile-card">
        <ion-avatar class="shop-avatar">
          <ion-icon :icon="storefront" />
        </ion-avatar>
        <div>
          <h2>{{ storeProfile.name }}</h2>
          <p>{{ storeProfile.address }}</p>
        </div>
      </div>

      <ion-list inset>
        <ion-item button router-link="/buyer">
          <ion-icon slot="start" :icon="qrCode" />
          <ion-label>顾客端入口（智购顾问）</ion-label>
          <ion-icon slot="end" :icon="chevronForward" size="small" />
        </ion-item>
        <ion-item button router-link="/alerts">
          <ion-icon slot="start" :icon="warning" />
          <ion-label>库存预警</ion-label>
        </ion-item>
        <ion-item button router-link="/queries">
          <ion-icon slot="start" :icon="chatbubbleEllipses" />
          <ion-label>顾客咨询</ion-label>
        </ion-item>
        <ion-item button router-link="/settings">
          <ion-icon slot="start" :icon="settings" />
          <ion-label>店铺与 AI 设置</ion-label>
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-item>
          <ion-icon slot="start" :icon="sparkles" />
          <ion-label>AI 模式</ion-label>
          <ion-badge :color="hasKey ? 'success' : 'warning'" slot="end">
            {{ hasKey ? 'AI 在线' : '演示模式' }}
          </ion-badge>
        </ion-item>
        <ion-item>
          <ion-icon slot="start" :icon="layers" />
          <ion-label>数据存储</ion-label>
          <ion-note slot="end">本地（手机/浏览器）</ion-note>
        </ion-item>
      </ion-list>

      <div class="ion-padding">
        <ion-button expand="block" fill="outline" color="danger" @click="confirmReset">
          <ion-icon slot="start" :icon="refresh" />重置演示数据
        </ion-button>
        <p class="center-note">智售引擎 MVP · Ionic + Capacitor + Vue 3 · AI：DeepSeek（可配置，无 Key 自动降级）</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonAvatar, IonIcon, IonList,
  IonItem, IonLabel, IonBadge, IonNote, IonButton, alertController } from '@ionic/vue';
import { storefront, qrCode, chevronForward, warning, chatbubbleEllipses, settings, sparkles, layers, refresh } from 'ionicons/icons';
import { storeProfile } from '@/services/data';
import { resetAll } from '@/services/data';
import { hasApiKey } from '@/services/store.service';
import { showToast } from '@/composables/useToast';

const hasKey = computed(() => hasApiKey());

async function confirmReset() {
  const alert = await alertController.create({
    header: '重置演示数据',
    message: '将清空本地商品、销售、咨询与设置并恢复初始演示数据，确定继续吗？',
    buttons: [
      { text: '取消', role: 'cancel' },
      {
        text: '重置',
        role: 'destructive',
        handler: async () => {
          await resetAll();
          await showToast('已恢复演示数据', 'success');
        }
      }
    ]
  });
  await alert.present();
}
</script>
