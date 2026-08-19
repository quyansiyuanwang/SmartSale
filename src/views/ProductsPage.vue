<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-title>商品管理</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/product/new" class="products-add-button" aria-label="新增商品">
            <ion-icon slot="start" :icon="add" />
            <span>新增商品</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar v-model="search" placeholder="搜索名称 / 条码 / 货架" />
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-list>
        <ion-item v-for="p in filtered" :key="p.id" button :router-link="`/product/${p.id}`" detail>
          <ion-thumbnail slot="start" class="prod-thumb">
            <div class="thumb-inner">{{ p.category.slice(0, 1) }}</div>
          </ion-thumbnail>
          <ion-label>
            <h2>{{ p.name }}</h2>
            <p>{{ p.category }} · {{ p.location }} 货架</p>
          </ion-label>
          <div class="prod-right">
            <div class="price">{{ fmtMoney(p.price) }}</div>
            <ion-badge :color="p.stock <= p.safeStock ? 'danger' : 'success'">库存 {{ p.stock }}</ion-badge>
          </div>
        </ion-item>
        <ion-item v-if="!filtered.length">
          <ion-label class="ion-text-center">没有匹配的商品，点击右下角 + 新增</ion-label>
        </ion-item>
      </ion-list>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonSearchbar, IonContent, IonList, IonItem,
  IonThumbnail, IonLabel, IonBadge, IonIcon } from '@ionic/vue';
import { add } from 'ionicons/icons';
import { listProducts } from '@/services/product.service';
import { fmtMoney } from '@/services/report.service';

const search = ref('');
const filtered = computed(() => listProducts(search.value));
</script>
