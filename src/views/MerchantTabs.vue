<template>
  <ion-page>
    <aside class="merchant-sidebar">
      <div class="sidebar-brand"><span class="brand-mark">S</span><span>智售引擎</span></div>
      <nav aria-label="管理导航">
        <a v-for="item in navItems" :key="item.path" :href="item.path" class="sidebar-link"><ion-icon :icon="item.icon" /><span>{{ item.label }}</span></a>
      </nav>
      <div class="sidebar-foot">门店运营后台</div>
    </aside>
    <header class="merchant-topbar"><strong>门店运营</strong><span>数据与库存实时同步</span></header>
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
const navItems = [{ path: '/tabs/home', label: '首页', icon: home }, { path: '/tabs/products', label: '商品', icon: cube }, { path: '/tabs/sales', label: '销售', icon: cart }, { path: '/tabs/reports', label: '报表', icon: statsChart }, { path: '/tabs/more', label: '更多', icon: ellipsisHorizontal }];
</script>
