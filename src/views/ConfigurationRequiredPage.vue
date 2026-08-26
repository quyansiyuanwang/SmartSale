<template>
  <ion-page class="configuration-page">
    <ion-content :fullscreen="true" class="ion-padding">
      <main class="configuration-shell">
        <ion-icon :icon="cloudOfflineOutline" />
        <p>SMART SALE PLATFORM</p>
        <h1>平台服务尚未配置</h1>
        <span>请配置 Supabase URL、Anon Key 和顾客站点基础 URL 后重新构建。需要本机演示时，请使用 <code>npm run demo</code>。</span>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonIcon, IonPage } from '@ionic/vue';
import { cloudOfflineOutline } from 'ionicons/icons';
</script>
