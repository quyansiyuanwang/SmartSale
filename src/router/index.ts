import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import MerchantTabs from '@/views/MerchantTabs.vue';

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/tabs/home' },
  {
    path: '/tabs',
    component: MerchantTabs,
    children: [
      { path: '', redirect: '/tabs/home' },
      { path: 'home', component: () => import('@/views/HomePage.vue') },
      { path: 'products', component: () => import('@/views/ProductsPage.vue') },
      { path: 'sales', component: () => import('@/views/SalesPage.vue') },
      { path: 'reports', component: () => import('@/views/ReportsPage.vue') },
      { path: 'more', component: () => import('@/views/MorePage.vue') }
    ]
  },
  { path: '/product/new', component: () => import('@/views/ProductEditPage.vue') },
  { path: '/product/:id', component: () => import('@/views/ProductEditPage.vue') },
  { path: '/alerts', component: () => import('@/views/AlertsPage.vue') },
  { path: '/queries', component: () => import('@/views/QueriesPage.vue') },
  { path: '/settings', component: () => import('@/views/SettingsPage.vue') },
  { path: '/buyer', component: () => import('@/views/BuyerHomePage.vue') }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
