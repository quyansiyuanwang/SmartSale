import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import MerchantTabs from '@/views/MerchantTabs.vue';
import { isDemoMode, hasSupabaseConfig } from '@/lib/supabase';
import { useAuth } from '@/composables/useAuth';

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/tabs/home' },
  { path: '/login', component: () => import('@/views/LoginPage.vue'), meta: { public: true } },
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
  { path: '/buyer', component: () => import('@/views/BuyerHomePage.vue'), meta: { public: true } },
  { path: '/s/:slug', component: () => import('@/views/BuyerHomePage.vue'), meta: { public: true } }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (to) => {
  if (isDemoMode || !hasSupabaseConfig || to.meta.public) return true;
  const { user, initializeAuth } = useAuth();
  if (!user.value) await initializeAuth();
  return user.value ? true : { path: '/login', query: { redirect: to.fullPath } };
});

export default router;
