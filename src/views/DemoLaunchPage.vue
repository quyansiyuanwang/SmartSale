<template>
  <ion-page class="demo-launch-page">
    <ion-content :fullscreen="true" class="ion-padding">
      <main class="demo-launch-shell">
        <section class="demo-launch-hero">
          <p>SMART SALE / RETAIL AI DEMO</p>
          <h1>让每一次顾客提问，变成门店的一次行动。</h1>
          <span>智店管家与智购顾问已经准备好。</span>
        </section>

        <section class="demo-entry-grid" aria-label="演示入口">
          <button class="demo-entry merchant" type="button" @click="go('/tabs/home')">
            <ion-icon :icon="storefront" />
            <span>商家端</span>
            <small>库存、销售与经营机会</small>
          </button>
          <button class="demo-entry buyer" type="button" @click="go(buyerEntry)">
            <ion-icon :icon="chatbubbles" />
            <span>顾客端</span>
            <small>扫码导购与场景化问答</small>
          </button>
        </section>

        <section class="demo-flow">
          <div><strong>双 Agent 演示闭环</strong><span>一次运行展示补货提醒与顾客需求促销。</span></div>
          <ion-button color="warning" @click="runFlow" :disabled="running">
            <ion-icon slot="start" :icon="sparkles" />{{ running ? '正在生成…' : '一键运行闭环' }}
          </ion-button>
        </section>

        <div class="demo-footer-actions">
          <ion-button fill="clear" color="medium" @click="resetDemo">
            <ion-icon slot="start" :icon="refresh" />恢复初始演示数据
          </ion-button>
          <ion-button fill="clear" color="medium" router-link="/architecture">
            查看双 Agent 架构
          </ion-button>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonButton, IonIcon } from '@ionic/vue';
import { chatbubbles, refresh, sparkles, storefront } from 'ionicons/icons';
import { resetAll } from '@/services/data';
import { runBuyerWorkflow } from '@/services/agent-orchestrator.service';
import { showToast } from '@/composables/useToast';
import { demoPublicAccessToken, publicStoreUrl } from '@/lib/platform-config';

const router = useRouter();
const running = ref(false);

function go(path: string) { void router.push(path); }
const buyerEntry = publicStoreUrl('demo-store', demoPublicAccessToken());

async function runFlow() {
  if (running.value) return;
  running.value = true;
  try {
    await runBuyerWorkflow('水龙头怎么安装');
    await runBuyerWorkflow('电工胶带在哪');
    await runBuyerWorkflow('电工胶带多少钱');
    await router.push('/insights');
  } catch (error) {
    await showToast(error instanceof Error ? error.message : '演示运行失败', 'danger');
  } finally {
    running.value = false;
  }
}

async function resetDemo() {
  await resetAll();
  await showToast('已恢复初始演示数据', 'success');
}
</script>
