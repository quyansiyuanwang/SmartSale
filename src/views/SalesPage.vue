<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-title>销售录入</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar v-model="search" placeholder="搜索商品名称 / 输入条码" />
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <template v-if="!selected">
        <ion-list class="pick-list">
          <ion-item v-for="p in filtered" :key="p.id" button @click="select(p)">
            <ion-label>
              <h2>{{ p.name }}</h2>
              <p>{{ p.location }} 货架 · 库存 {{ p.stock }}</p>
            </ion-label>
            <div slot="end" class="price">{{ fmtMoney(p.price) }}</div>
          </ion-item>
          <ion-item v-if="!filtered.length">
            <ion-label class="ion-text-center">未找到匹配商品</ion-label>
          </ion-item>
        </ion-list>
      </template>

      <ion-card v-else>
        <ion-card-header class="card-header">
          <ion-card-title>{{ selected.name }}</ion-card-title>
          <ion-card-subtitle>{{ selected.location }} 货架 · 库存 {{ selected.stock }}</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="num-row">
            <ion-button fill="outline" size="small" @click="qty = Math.max(1, qty - 1)">－</ion-button>
            <ion-input class="qty-input" type="number" v-model.number="qty" min="1" />
            <ion-button fill="outline" size="small" @click="qty = qty + 1">＋</ion-button>
            <span class="qty-label">件</span>
          </div>
          <div class="total-row">应收：<b>{{ fmtMoney(total) }}</b></div>
          <ion-button expand="block" color="success" @click="confirm" :disabled="saving">
            <ion-icon slot="start" :icon="checkmark" />确认收款并扣库存
          </ion-button>
          <ion-button expand="block" fill="clear" @click="selected = null">换一个商品</ion-button>
        </ion-card-content>
      </ion-card>

      <div class="section-title">今日销售记录（{{ todayList.length }}）</div>
      <ion-list>
        <ion-item v-for="s in todayList" :key="s.id">
          <ion-label>
            <h2>{{ s.productName }}</h2>
            <p>{{ timeText(s.time) }} · {{ fmtMoney(s.unitPrice) }} × {{ s.qty }}</p>
          </ion-label>
          <ion-note slot="end">{{ fmtMoney(s.total) }}</ion-note>
        </ion-item>
        <ion-item v-if="!todayList.length">
          <ion-label class="ion-text-center">今天还没有销售记录</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonSearchbar, IonContent, IonList, IonItem,
  IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonInput,
  IonButton, IonIcon, IonNote } from '@ionic/vue';
import { checkmark } from 'ionicons/icons';
import { Product } from '@/types';
import { listProducts, findProduct } from '@/services/product.service';
import { recordSale, todaySales } from '@/services/sale.service';
import { fmtMoney } from '@/services/report.service';
import { showToast } from '@/composables/useToast';

const search = ref('');
const selected = ref<Product | null>(null);
const qty = ref(1);
const saving = ref(false);
const todayList = ref(todaySales());

const filtered = computed(() => {
  const kw = search.value.trim();
  if (!kw) return listProducts();
  const byName = listProducts(kw);
  if (byName.length) return byName;
  const p = listProducts().find((x) => x.barcode === kw);
  return p ? [p] : [];
});
const total = computed(() => qty.value * (selected.value?.price ?? 0));

function select(p: Product) {
  selected.value = p;
  qty.value = 1;
  search.value = '';
}

async function confirm() {
  if (!selected.value) return;
  saving.value = true;
  try {
    const res = await recordSale(selected.value.id, qty.value);
    if (res.ok) {
      await showToast(`已售出 ${res.sale?.productName} ×${res.sale?.qty}`, 'success');
      selected.value = null;
      qty.value = 1;
      todayList.value = todaySales();
    } else {
      await showToast(res.error || '销售失败', 'danger');
    }
  } finally {
    saving.value = false;
  }
}

function timeText(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onIonViewWillEnter(() => {
  todayList.value = todaySales();
});
</script>
