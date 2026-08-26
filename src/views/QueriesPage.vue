<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/tabs/home" /></ion-buttons>
        <ion-title>顾客咨询</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="demoMode" color="danger" @click="clearAll">清空</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar class="list-controls-toolbar">
        <div class="list-controls">
          <ion-segment v-model="statusFilter" class="compact-segment" aria-label="咨询状态筛选">
            <ion-segment-button value="all"><ion-label>全部</ion-label></ion-segment-button>
            <ion-segment-button value="new"><ion-label>待跟进</ion-label></ion-segment-button>
            <ion-segment-button value="followed"><ion-label>已跟进</ion-label></ion-segment-button>
          </ion-segment>
          <ion-select v-model="sortBy" interface="popover" aria-label="咨询排序" class="list-select">
            <ion-select-option value="newest">最新咨询</ion-select-option>
            <ion-select-option value="oldest">最早咨询</ion-select-option>
          </ion-select>
        </div>
      </ion-toolbar>
      <ion-toolbar v-if="selectedIds.size" color="light" class="bulk-toolbar">
        <div class="bulk-actions">
          <span>已选 {{ selectedIds.size }} 项</span>
          <ion-button fill="clear" size="small" @click="toggleAllVisible">{{ allVisibleSelected ? '取消全选' : '全选当前结果' }}</ion-button>
          <ion-button color="success" size="small" @click="followSelected">
            <ion-icon slot="icon-only" :icon="checkmarkDoneOutline" />
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-list>
        <ion-item v-for="q in list" :key="q.id" lines="full">
          <ion-checkbox
            slot="start"
            :checked="selectedIds.has(q.id)"
            :aria-label="`选择咨询：${q.content}`"
            @click.stop
            @ion-change="setSelected(q.id, $event.detail.checked)"
          />
          <ion-label class="ion-padding-vertical">
            <div class="q-head">
              <h2>{{ q.content }}</h2>
              <ion-badge :color="q.demo ? 'warning' : 'primary'" size="small">
                {{ q.demo ? '演示模式' : 'AI 在线' }}
              </ion-badge>
              <ion-badge :color="q.status === 'followed' ? 'success' : 'medium'" size="small">
                {{ q.status === 'followed' ? '已跟进' : '待跟进' }}
              </ion-badge>
            </div>
            <p class="q-answer">{{ q.answer }}</p>
            <p v-if="q.error" class="q-answer ion-color-danger">服务错误：{{ q.error }}</p>
            <p v-if="q.provider || q.model || q.latencyMs" class="q-time">{{ q.provider || 'AI' }}{{ q.model ? ` · ${q.model}` : '' }}{{ q.latencyMs ? ` · ${q.latencyMs}ms` : '' }}</p>
            <p v-if="q.sourceDocumentIds?.length" class="q-time">来源文档：{{ q.sourceDocumentIds.length }} 份</p>
            <p class="q-time">{{ fullText(q.createdAt) }}</p>
          </ion-label>
        </ion-item>
        <ion-item v-if="!list.length">
          <ion-label class="ion-text-center">暂无顾客咨询，去「顾客端」体验问答吧</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonBadge, IonCheckbox, IonSegment, IonSegmentButton, IonSelect, IonSelectOption,
  IonIcon } from '@ionic/vue';
import { checkmarkDoneOutline } from 'ionicons/icons';
import { listQueries, clearQueries, markQueriesFollowed } from '@/services/query.service';
import { showToast } from '@/composables/useToast';
import { isDemoMode } from '@/lib/supabase';

const rawList = ref(listQueries());
const demoMode = isDemoMode;
const statusFilter = ref<'all' | 'new' | 'followed'>('all');
const sortBy = ref<'newest' | 'oldest'>('newest');
const selectedIds = ref(new Set<string>());
const list = computed(() => rawList.value
  .filter((query) => statusFilter.value === 'all' || query.status === statusFilter.value)
  .sort((a, b) => sortBy.value === 'newest'
    ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
const allVisibleSelected = computed(() => list.value.length > 0 && list.value.every((query) => selectedIds.value.has(query.id)));

async function clearAll() {
  await clearQueries();
  rawList.value = [];
  selectedIds.value = new Set();
  await showToast('已清空咨询记录');
}

function setSelected(id: string, checked: boolean) {
  const next = new Set(selectedIds.value);
  if (checked) next.add(id); else next.delete(id);
  selectedIds.value = next;
}

function toggleAllVisible() {
  const next = new Set(selectedIds.value);
  if (allVisibleSelected.value) list.value.forEach((query) => next.delete(query.id));
  else list.value.forEach((query) => next.add(query.id));
  selectedIds.value = next;
}

async function followSelected() {
  const ids = [...selectedIds.value];
  try {
    await markQueriesFollowed(ids);
    rawList.value = listQueries();
    selectedIds.value = new Set();
    await showToast(`已跟进 ${ids.length} 条咨询`, 'success');
  } catch (error) {
    await showToast(error instanceof Error ? error.message : '更新失败', 'danger');
  }
}

function fullText(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onIonViewWillEnter(() => {
  rawList.value = listQueries();
  selectedIds.value = new Set();
});
</script>
