<template>
  <ion-page>
    <ion-header translucent><ion-toolbar><ion-buttons slot="start"><ion-back-button default-href="/tabs/more" /></ion-buttons><ion-title>门店服务设置</ion-title></ion-toolbar></ion-header>
    <ion-content :fullscreen="true" class="ion-padding settings-page">
      <ion-card><ion-card-header><ion-card-title>门店资料</ion-card-title><ion-card-subtitle>这些信息会显示在顾客扫码入口。</ion-card-subtitle></ion-card-header><ion-card-content><div class="settings-grid"><ion-item><ion-label position="stacked">门店名称</ion-label><ion-input v-model="profile.name" /></ion-item><ion-item><ion-label position="stacked">联系电话</ion-label><ion-input v-model="profile.phone" /></ion-item><ion-item><ion-label position="stacked">门店地址</ion-label><ion-input v-model="profile.address" /></ion-item><ion-item><ion-label position="stacked">营业时间</ion-label><ion-input v-model="profile.hours" placeholder="08:00-21:00" /></ion-item></div><ion-item><ion-label position="stacked">顾客欢迎语</ion-label><ion-textarea v-model="profile.welcome" :rows="2" /></ion-item><ion-button class="settings-save" @click="saveProfileHandler">保存门店资料</ion-button></ion-card-content></ion-card>

      <ion-card><ion-card-header><ion-card-title>顾客扫码服务</ion-card-title><ion-card-subtitle>二维码固定绑定门店公开地址，更新应用后不需要重新印码。</ion-card-subtitle></ion-card-header><ion-card-content><div class="service-grid"><div class="qr-frame"><img v-if="qrDataUrl" :src="qrDataUrl" alt="顾客扫码入口二维码" /><ion-spinner v-else /></div><div class="service-details"><ion-item lines="none"><ion-label><h3>公开售前服务</h3><p>{{ serviceLabel }}</p></ion-label><ion-toggle v-model="publicEnabled" :disabled="isDemo" @ionChange="saveService" /></ion-item><ion-item lines="none"><ion-label position="stacked">顾客入口</ion-label><ion-input :value="storeUrl" readonly /></ion-item><div class="service-actions"><ion-button size="small" fill="outline" @click="copyPublicUrl"><ion-icon slot="start" :icon="copyOutline" />复制链接</ion-button><ion-button size="small" @click="downloadQr"><ion-icon slot="start" :icon="downloadOutline" />下载二维码</ion-button></div><ion-note v-if="isDemo" class="block-note" color="medium">演示模式中的二维码仅在当前设备可用。发布后会自动使用平台正式域名。</ion-note></div></div></ion-card-content></ion-card>

      <ion-card><ion-card-header><ion-card-title>商品批量导入</ion-card-title><ion-card-subtitle>支持 CSV、Excel（.xlsx）文件；系统会先检查全部数据，避免部分写入。</ion-card-subtitle></ion-card-header><ion-card-content><div class="import-actions"><ion-button fill="outline" @click="downloadTemplate"><ion-icon slot="start" :icon="documentTextOutline" />下载模板</ion-button><ion-button @click="chooseFile" :disabled="importing"><ion-icon slot="start" :icon="cloudUploadOutline" />{{ importing ? '正在导入…' : '选择文件导入' }}</ion-button><input ref="fileInput" class="hidden-file" type="file" accept=".csv,.xlsx,.xls" @change="handleFile" /></div><ion-note v-if="importMessage" class="block-note" :color="importErrors.length ? 'danger' : 'success'">{{ importMessage }}</ion-note><ion-list v-if="importErrors.length" lines="inset" class="import-errors"><ion-item v-for="(item,index) in importErrors.slice(0,8)" :key="`${item.row}-${index}`"><ion-label>第 {{ item.row || '已存在' }} 行：{{ item.message }}</ion-label></ion-item></ion-list></ion-card-content></ion-card>

      <ion-card><ion-card-header><ion-card-title>平台 AI 服务</ion-card-title><ion-card-subtitle>智售引擎统一提供售前问答服务，无需在门店设备配置 API Key。</ion-card-subtitle></ion-card-header><ion-card-content><ion-item lines="none"><ion-icon slot="start" :icon="sparkles" color="success" /><ion-label><h3>平台托管 AI</h3><p>顾客问答受门店状态、公开内容与平台额度保护。</p></ion-label><ion-badge slot="end" color="success">已托管</ion-badge></ion-item></ion-card-content></ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import QRCode from 'qrcode';
import { onIonViewWillEnter, IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItem, IonLabel, IonInput, IonTextarea, IonButton, IonNote, IonToggle, IonIcon, IonSpinner, IonBadge, IonList } from '@ionic/vue';
import { copyOutline, downloadOutline, documentTextOutline, cloudUploadOutline, sparkles } from 'ionicons/icons';
import { storeProfile } from '@/services/data';
import { saveProfile, loadPublicServiceSettings, savePublicServiceSettings } from '@/services/store.service';
import { publicStoreUrl } from '@/lib/platform-config';
import { isDemoMode } from '@/lib/supabase';
import { useAuth } from '@/composables/useAuth';
import { parseProductFile, importProducts, productTemplate, type ImportError } from '@/services/product-import.service';
import { showToast } from '@/composables/useToast';

const { currentStore } = useAuth(); const profile = reactive({ ...storeProfile.value }); const publicEnabled = ref(true); const serviceStatus = ref<'active' | 'suspended'>('active'); const qrDataUrl = ref(''); const fileInput = ref<HTMLInputElement | null>(null); const importing = ref(false); const importMessage = ref(''); const importErrors = ref<ImportError[]>([]); const isDemo = isDemoMode;
const storeUrl = computed(() => publicStoreUrl(currentStore.value?.slug || 'demo-store')); const serviceLabel = computed(() => !publicEnabled.value || serviceStatus.value === 'suspended' ? '顾客入口已暂停，扫码会显示服务暂停页。' : '顾客扫码后可查看商品、促销并进行售前问答。');
async function refresh() { Object.assign(profile, storeProfile.value); if (!isDemo) { const settings = await loadPublicServiceSettings(); publicEnabled.value = settings.publicEnabled; serviceStatus.value = settings.serviceStatus; } await nextTick(); qrDataUrl.value = await QRCode.toDataURL(storeUrl.value, { width: 420, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#18342e', light: '#ffffff' } }); }
async function saveProfileHandler() { await saveProfile({ ...profile }); await showToast('门店资料已保存', 'success'); }
async function saveService() { try { await savePublicServiceSettings({ publicEnabled: publicEnabled.value, serviceStatus: serviceStatus.value }); await showToast(publicEnabled.value ? '顾客扫码服务已开启' : '顾客扫码服务已暂停', 'success'); } catch (error) { publicEnabled.value = !publicEnabled.value; await showToast(error instanceof Error ? error.message : '保存失败', 'danger'); } }
async function copyPublicUrl() { try { await navigator.clipboard.writeText(storeUrl.value); await showToast('顾客入口链接已复制', 'success'); } catch { await showToast('复制失败，请手动复制链接', 'danger'); } }
function triggerDownload(href: string, fileName: string) { const anchor = document.createElement('a'); anchor.href = href; anchor.download = fileName; document.body.append(anchor); anchor.click(); anchor.remove(); }
function downloadQr() { if (qrDataUrl.value) triggerDownload(qrDataUrl.value, `${currentStore.value?.slug || 'smart-sale'}-qr.png`); }
function downloadTemplate() { triggerDownload(URL.createObjectURL(productTemplate()), 'smart-sale-products-template.csv'); }
function chooseFile() { fileInput.value?.click(); }
async function handleFile(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; importing.value = true; importMessage.value = ''; importErrors.value = []; try { const rows = await parseProductFile(file); const result = await importProducts(rows); importErrors.value = result.errors; importMessage.value = result.errors.length ? `导入前校验发现 ${result.errors.length} 个问题，请修正后重试。` : `已成功导入 ${result.imported} 个商品。`; } catch (error) { importMessage.value = error instanceof Error ? error.message : '导入失败，请重试'; importErrors.value = [{ row: 0, message: importMessage.value }]; } finally { importing.value = false; (event.target as HTMLInputElement).value = ''; } }
onMounted(() => { void refresh(); }); onIonViewWillEnter(() => { void refresh(); });
</script>
