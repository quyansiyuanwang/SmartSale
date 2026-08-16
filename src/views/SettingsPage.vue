<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/tabs/more" /></ion-buttons>
        <ion-title>店铺与 AI 设置</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-card>
        <ion-card-header><ion-card-title>店铺资料</ion-card-title></ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label position="stacked">店铺名称</ion-label>
            <ion-input v-model="profile.name" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">地址</ion-label>
            <ion-input v-model="profile.address" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">联系电话</ion-label>
            <ion-input v-model="profile.phone" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">营业时间</ion-label>
            <ion-input v-model="profile.hours" placeholder="08:00-21:00" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">买家端欢迎语</ion-label>
            <ion-textarea v-model="profile.welcome" :rows="2" />
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" @click="saveProfileHandler">保存店铺资料</ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>AI 配置（DeepSeek）</ion-card-title>
          <ion-card-subtitle>填入 API Key 后启用在线 AI；留空则使用本地演示回复</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label position="stacked">API Key</ion-label>
            <ion-input v-model="llm.apiKey" type="password" placeholder="sk-..." />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">接口地址</ion-label>
            <ion-input v-model="llm.baseUrl" placeholder="https://api.deepseek.com" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">模型</ion-label>
            <ion-input v-model="llm.model" placeholder="deepseek-chat" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">超时（毫秒）</ion-label>
            <ion-input type="number" v-model.number="llm.timeoutMs" />
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" @click="saveLlmHandler">保存 AI 配置</ion-button>
          <ion-note color="medium" class="ion-padding-top block-note">
            ⚠️ MVP 说明：Key 仅保存在本机（浏览器/手机），未做服务端安全存储，请勿在生产环境使用。
          </ion-note>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItem, IonLabel,
  IonInput, IonTextarea, IonButton, IonNote } from '@ionic/vue';
import { storeProfile, llmConfig } from '@/services/data';
import { saveProfile, saveLlmConfig } from '@/services/store.service';
import { showToast } from '@/composables/useToast';

const profile = reactive({ ...storeProfile.value });
const llm = reactive({ ...llmConfig.value });

async function saveProfileHandler() {
  await saveProfile({ ...profile });
  await showToast('店铺资料已保存', 'success');
}

async function saveLlmHandler() {
  await saveLlmConfig({ ...llm, timeoutMs: Number(llm.timeoutMs) || 30000 });
  await showToast(llm.apiKey.trim() ? 'AI 配置已保存（已启用在线 AI）' : 'AI 配置已保存（演示模式）', 'success');
}

onIonViewWillEnter(() => {
  Object.assign(profile, storeProfile.value);
  Object.assign(llm, llmConfig.value);
});
</script>
