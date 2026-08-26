import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import MerchantTabs from '@/views/MerchantTabs.vue';
import { isDemoMode, hasSupabaseConfig } from '@/lib/supabase';
import { getPlatformConfig, lastPublicStoreSlug } from '@/lib/platform-config';
import { useAuth } from '@/composables/useAuth';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: () => {
      const config = getPlatformConfig();
      if (config.mode === 'demo-local') return '/demo';
      if (config.mode === 'misconfigured') return '/configuration-required';
      const lastStore = lastPublicStoreSlug();
      return lastStore ? `/s/${lastStore}` : '/tabs/home';
    }
  },
  { path: '/configuration-required', component: () => import('@/views/ConfigurationRequiredPage.vue'), meta: { public: true } },
  { path: '/demo', component: () => import('@/views/DemoLaunchPage.vue'), meta: { public: true } },
  { path: '/login', component: () => import('@/views/LoginPage.vue'), meta: { public: true } },
  { path: '/onboarding', component: () => import('@/views/OnboardingPage.vue') },
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
  { path: '/insights', component: () => import('@/views/InsightsPage.vue') },
  { path: '/architecture', component: () => import('@/views/ArchitecturePage.vue') },
  { path: '/settings', component: () => import('@/views/SettingsPage.vue') },
  { path: '/buyer', component: () => import('@/views/BuyerHomePage.vue'), meta: { public: true } },
  { path: '/s/:slug', component: () => import('@/views/BuyerHomePage.vue'), meta: { public: true } }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (to) => {
  if (!isDemoMode && !hasSupabaseConfig) return to.path === '/configuration-required' ? true : '/configuration-required';
  if (isDemoMode || to.meta.public) return true;
  const { user, currentStore, initializeAuth } = useAuth();
  if (!user.value) await initializeAuth();
  if (!user.value) return { path: '/login', query: { redirect: to.fullPath } };
  if (!currentStore.value && to.path !== '/onboarding') return { path: '/onboarding' };
  if (currentStore.value && to.path === '/onboarding') return { path: '/tabs/home' };
  return true;
});

export default router;
