<template>
  <ion-page class="login-page"><ion-content class="ion-padding"><main class="login-shell"><section><p class="eyebrow">SMART SALE</p><h1>智售引擎</h1><p>登录后管理门店、商品与知识库。</p></section><form class="login-form" @submit.prevent="submit"><ion-item><ion-input v-model="email" type="email" label="邮箱" label-placement="stacked" autocomplete="email" required /></ion-item><ion-item><ion-input v-model="password" type="password" label="密码" label-placement="stacked" autocomplete="current-password" required /></ion-item><ion-note v-if="error" color="danger">{{ error }}</ion-note><ion-button type="submit" expand="block" :disabled="submitting">{{ submitting ? '登录中…' : '邮箱登录' }}</ion-button><ion-note color="medium">账号由门店管理员在 Supabase Auth 中创建。</ion-note></form></main></ion-content></ion-page>
</template>
<script setup lang="ts">
import { ref } from 'vue'; import { useRouter } from 'vue-router'; import { IonPage, IonContent, IonItem, IonInput, IonButton, IonNote } from '@ionic/vue'; import { useAuth } from '@/composables/useAuth';
const router=useRouter(); const {signIn}=useAuth(); const email=ref(''); const password=ref(''); const error=ref(''); const submitting=ref(false);
async function submit(){submitting.value=true; error.value=''; try { await signIn(email.value,password.value); await router.replace('/tabs/home'); } catch(e){error.value=e instanceof Error?e.message:'登录失败';} finally{submitting.value=false;}}
</script>
