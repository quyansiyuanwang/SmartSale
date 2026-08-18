import { createApp } from 'vue'
import App from './App.vue'
import router from './router';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* Theme variables */
import './theme/variables.css';
import './theme/custom.css';

/* PWA service worker (auto update) */
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });

/* Load local data before mounting */
import { loadAll } from './services/data';
import { useAuth } from './composables/useAuth';

const app = createApp(App)
  .use(IonicVue)
  .use(router);

useAuth().initializeAuth().then(loadAll).finally(() => {
  router.isReady().then(() => {
    app.mount('#app');
  });
});
