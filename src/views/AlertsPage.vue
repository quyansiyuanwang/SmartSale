<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/tabs/home" /></ion-buttons>
        <ion-title>库存预警</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="alerts-topbar">
        <ion-note color="medium">低于或等于安全库存的商品会在这里提醒，及时补货避免断货。</ion-note>
        <div class="alert-actions">
          <ion-button size="small" fill="outline" @click="openImport">
            <ion-icon slot="start" :icon="cloudUpload" />批量导入库存
          </ion-button>
          <ion-button v-if="voiceAlert.supported && items.length" size="small" fill="outline" :color="voiceAlert.speaking.value ? 'danger' : 'primary'" @click="toggleBroadcast">
          <ion-icon slot="start" :icon="voiceAlert.speaking.value ? stop : volumeHigh" />
          {{ voiceAlert.speaking.value ? '停止播报' : '语音播报' }}
          </ion-button>
        </div>
      </div>
      <ion-list class="ion-margin-top">
        <ion-item v-for="p in items" :key="p.id">
          <ion-label>
            <h2>{{ p.name }}</h2>
            <p>{{ p.category }} · {{ p.location }} 货架 · 进价 {{ fmtMoney(p.buyPrice) }}</p>
          </ion-label>
          <div class="alert-right">
            <ion-badge color="danger">剩 {{ p.stock }} / 安全 {{ p.safeStock }}</ion-badge>
            <ion-button size="small" fill="outline" @click="restock(p.id)">补货</ion-button>
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
import { useRouter } from 'vue-router';
import { onIonViewWillEnter } from '@ionic/vue';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
  IonNote, IonList, IonItem, IonLabel, IonBadge, IonButton, IonIcon, alertController } from '@ionic/vue';
import { stop, volumeHigh, cloudUpload } from 'ionicons/icons';
import { lowStock, fmtMoney } from '@/services/report.service';
import { adjustStock } from '@/services/product.service';
import { useVoiceAlert } from '@/composables/useVoiceAlert';
import { showToast } from '@/composables/useToast';

const items = ref(lowStock());
const voiceAlert = useVoiceAlert();
const router = useRouter();

function openImport() {
  void router.push({ path: '/settings', hash: '#stock-import' });
}

function toggleBroadcast() {
  if (voiceAlert.speaking.value) {
    voiceAlert.stop();
    return;
  }
  const text = items.value
    .slice(0, 5)
    .map((p) => `「${p.name}」只剩${p.stock}件`)
    .join('，');
  voiceAlert.speak(`库存预警，共${items.value.length}个商品需要补货：${text}。请及时补货。`);
}

async function restock(id: string) {
  const product = items.value.find((item) => item.id === id);
  if (!product) return;
  const dialog = await alertController.create({
    header: `补货：${product.name}`,
    message: `当前库存 ${product.stock} 件。请输入本次补货数量。`,
    inputs: [{
      name: 'quantity',
      type: 'number',
      value: 10,
      min: 1,
      max: 100000,
      placeholder: '补货数量（整数）',
      attributes: { inputmode: 'numeric', min: 1, max: 100000, step: 1 }
    }],
    buttons: [
      { text: '取消', role: 'cancel' },
      { text: '确认补货', role: 'confirm' }
    ]
  });
  await dialog.present();
  const result = await dialog.onDidDismiss();
  if (result.role !== 'confirm') return;
  const values = result.data as { values?: { quantity?: string | number } } | undefined;
  const quantity = Number(values?.values?.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
    await showToast('补货数量必须是 1–100000 的整数', 'danger');
    return;
  }
  try {
    await adjustStock(id, quantity);
    items.value = lowStock();
    await showToast(`已补货 +${quantity}`, 'success');
  } catch (error) {
    await showToast(error instanceof Error ? error.message : '补货失败，请重试', 'danger');
  }
}

onIonViewWillEnter(() => {
  items.value = lowStock();
});
</script>
