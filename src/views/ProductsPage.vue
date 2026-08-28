<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-title>商品管理</ion-title>
        <ion-buttons slot="end">
          <ion-button class="products-add-button" aria-label="新增商品" @click="openCreate">
            <ion-icon slot="start" :icon="add" />
            <span>新增商品</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar v-model="search" placeholder="搜索名称 / 条码 / 货架" />
      </ion-toolbar>
      <ion-toolbar class="list-controls-toolbar">
        <div class="list-controls">
          <ion-segment v-model="stockFilter" class="compact-segment" aria-label="库存筛选">
            <ion-segment-button value="all"><ion-label>全部</ion-label></ion-segment-button>
            <ion-segment-button value="low"><ion-label>库存预警</ion-label></ion-segment-button>
            <ion-segment-button value="normal"><ion-label>库存正常</ion-label></ion-segment-button>
          </ion-segment>
          <ion-select v-model="categoryFilter" interface="popover" aria-label="商品分类筛选" class="list-select">
            <ion-select-option value="all">全部分类</ion-select-option>
            <ion-select-option v-for="category in categories" :key="category" :value="category">{{ category }}</ion-select-option>
          </ion-select>
          <ion-select v-model="sortBy" interface="popover" aria-label="商品排序" class="list-select">
            <ion-select-option value="updated">最近修改</ion-select-option>
            <ion-select-option value="name">名称 A-Z</ion-select-option>
            <ion-select-option value="stockAsc">库存由低到高</ion-select-option>
            <ion-select-option value="priceDesc">售价由高到低</ion-select-option>
          </ion-select>
        </div>
      </ion-toolbar>
      <ion-toolbar v-if="selectedIds.size" color="light" class="bulk-toolbar">
        <div class="bulk-actions">
          <span>已选 {{ selectedIds.size }} 项</span>
          <ion-button fill="clear" size="small" @click="toggleAllVisible">{{ allVisibleSelected ? '取消全选' : '全选当前结果' }}</ion-button>
          <ion-button color="danger" size="small" @click="confirmDeleteSelected">
            <ion-icon slot="icon-only" :icon="trashOutline" />
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-list>
        <ion-item v-for="p in filtered" :key="p.id" button detail @click="openProduct(p.id)">
          <ion-checkbox
            slot="start"
            :checked="selectedIds.has(p.id)"
            :aria-label="`选择 ${p.name}`"
            @click.stop
            @ion-change="setSelected(p.id, $event.detail.checked)"
          />
          <ion-thumbnail slot="start" class="prod-thumb">
            <div class="thumb-inner">{{ p.category.slice(0, 1) }}</div>
          </ion-thumbnail>
          <ion-label>
            <h2>{{ p.name }}</h2>
            <p>{{ p.category }} · {{ p.location }} 货架</p>
          </ion-label>
          <div class="prod-right">
            <div class="price">{{ fmtMoney(p.price) }}</div>
            <ion-badge v-if="p.published === false" color="medium">未发布</ion-badge>
            <ion-badge :color="p.stock <= p.safeStock ? 'danger' : 'success'">库存 {{ p.stock }}</ion-badge>
          </div>
        </ion-item>
        <ion-item v-if="!filtered.length">
          <ion-label class="ion-text-center">没有符合筛选条件的商品</ion-label>
        </ion-item>
      </ion-list>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonSearchbar, IonContent, IonList, IonItem,
  IonThumbnail, IonLabel, IonBadge, IonIcon, IonCheckbox, IonSegment, IonSegmentButton, IonSelect, IonSelectOption,
  IonButton, alertController } from '@ionic/vue';
import { add, trashOutline } from 'ionicons/icons';
import { deleteProducts, listProducts } from '@/services/product.service';
import { fmtMoney } from '@/services/report.service';
import { showToast } from '@/composables/useToast';

const search = ref('');
const stockFilter = ref<'all' | 'low' | 'normal'>('all');
const categoryFilter = ref('all');
const sortBy = ref<'updated' | 'name' | 'stockAsc' | 'priceDesc'>('updated');
const selectedIds = ref(new Set<string>());
const router = useRouter();
const categories = computed(() => [...new Set(listProducts().map((product) => product.category))].sort());
const filtered = computed(() => {
  const result = listProducts(search.value).filter((product) => {
    const matchesCategory = categoryFilter.value === 'all' || product.category === categoryFilter.value;
    const matchesStock = stockFilter.value === 'all'
      || (stockFilter.value === 'low' && product.stock <= product.safeStock)
      || (stockFilter.value === 'normal' && product.stock > product.safeStock);
    return matchesCategory && matchesStock;
  });
  return result.sort((a, b) => {
    if (sortBy.value === 'name') return a.name.localeCompare(b.name, 'zh-CN');
    if (sortBy.value === 'stockAsc') return a.stock - b.stock || a.name.localeCompare(b.name, 'zh-CN');
    if (sortBy.value === 'priceDesc') return b.price - a.price || a.name.localeCompare(b.name, 'zh-CN');
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
});
const allVisibleSelected = computed(() => filtered.value.length > 0 && filtered.value.every((product) => selectedIds.value.has(product.id)));

function openCreate() {
  void router.push('/product/new');
}

function openProduct(id: string) {
  void router.push(`/product/${id}`);
}

function setSelected(id: string, checked: boolean) {
  const next = new Set(selectedIds.value);
  if (checked) next.add(id); else next.delete(id);
  selectedIds.value = next;
}

function toggleAllVisible() {
  const next = new Set(selectedIds.value);
  if (allVisibleSelected.value) filtered.value.forEach((product) => next.delete(product.id));
  else filtered.value.forEach((product) => next.add(product.id));
  selectedIds.value = next;
}

watch([search, stockFilter, categoryFilter], () => {
  selectedIds.value = new Set();
});

async function confirmDeleteSelected() {
  const count = selectedIds.value.size;
  const dialog = await alertController.create({
    header: '删除商品',
    message: `确定删除已选的 ${count} 个商品吗？此操作无法撤销。`,
    buttons: [
      { text: '取消', role: 'cancel' },
      { text: '删除', role: 'destructive', handler: () => { void deleteSelected(); } }
    ]
  });
  await dialog.present();
}

async function deleteSelected() {
  try {
    const count = selectedIds.value.size;
    await deleteProducts([...selectedIds.value]);
    selectedIds.value = new Set();
    await showToast(`已删除 ${count} 个商品`, 'success');
  } catch (error) {
    await showToast(error instanceof Error ? error.message : '删除失败', 'danger');
  }
}
</script>
