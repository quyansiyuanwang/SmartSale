<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/tabs/home" /></ion-buttons>
        <ion-title>库存预警</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-note color="medium">低于或等于安全库存的商品会在这里提醒，及时补货避免断货。</ion-note>
      <ion-list class="ion-margin-top">
        <ion-item v-for="p in items" :key="p.id">
          <ion-label>
            <h2>{{ p.name }}</h2>
            <p>{{ p.category }} · {{ p.location }} 货架 · 进价 {{ fmtMoney(p.buyPrice) }}</p>
          </ion-label>
          <div class="alert-right">
            <ion-badge color="danger">剩 {{ p.stock }} / 安全 {{ p.safeStock }}</ion-badge>
            <ion-button size="small" fill="outline" @click="restock(p.id)">补货 +10</ion-button>
          </div>
        </ion-item>
        <ion-item v-if="!items.length">
          <ion-label class="ion-text-center">库存充足，暂无预警 🎉</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
  IonNote, IonList, IonItem, IonLabel, IonBadge, IonButton } from '@ionic/vue';
import { lowStock, fmtMoney } from '@/services/report.service';
import { adjustStock } from '@/services/product.service';
import { showToast } from '@/composables/useToast';

const items = ref(lowStock());

async function restock(id: string) {
  await adjustStock(id, 10);
  items.value = lowStock();
  await showToast('已补货 +10（可到商品页修改数量）', 'success');
}

onIonViewWillEnter(() => {
  items.value = lowStock();
});
</script>
