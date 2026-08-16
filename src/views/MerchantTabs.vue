<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="home" />
          <ion-label>首页</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="products" href="/tabs/products">
          <ion-icon :icon="cube" />
          <ion-label>商品</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="sales" href="/tabs/sales">
          <ion-icon :icon="cart" />
          <ion-label>销售</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="reports" href="/tabs/reports">
          <ion-icon :icon="statsChart" />
          <ion-label>报表</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="more" href="/tabs/more">
          <ion-icon :icon="ellipsisHorizontal" />
          <ion-label>我的</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/vue';
import { home, cube, cart, statsChart, ellipsisHorizontal } from 'ionicons/icons';
</script>
