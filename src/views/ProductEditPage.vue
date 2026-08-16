<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/products" />
        </ion-buttons>
        <ion-title>{{ isNew ? '新增商品' : '编辑商品' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-item>
        <ion-label position="stacked">商品名称 *</ion-label>
        <ion-input v-model="form.name" placeholder="如：电工胶带" />
      </ion-item>
      <ion-item>
        <ion-label position="stacked">条码</ion-label>
        <ion-input v-model="form.barcode" placeholder="扫码枪/手动输入" />
      </ion-item>
      <ion-item>
        <ion-label position="stacked">分类</ion-label>
        <ion-select v-model="form.category">
          <ion-select-option v-for="c in categories" :key="c" :value="c">{{ c }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-row class="ion-padding-top">
        <ion-col>
          <ion-item>
            <ion-label position="stacked">进价（元）</ion-label>
            <ion-input type="number" v-model="form.buyPrice" />
          </ion-item>
        </ion-col>
        <ion-col>
          <ion-item>
            <ion-label position="stacked">售价（元）*</ion-label>
            <ion-input type="number" v-model="form.price" />
          </ion-item>
        </ion-col>
      </ion-row>
      <ion-row>
        <ion-col>
          <ion-item>
            <ion-label position="stacked">库存（件）</ion-label>
            <ion-input type="number" v-model="form.stock" />
          </ion-item>
        </ion-col>
        <ion-col>
          <ion-item>
            <ion-label position="stacked">安全库存</ion-label>
            <ion-input type="number" v-model="form.safeStock" />
          </ion-item>
        </ion-col>
      </ion-row>
      <ion-item>
        <ion-label position="stacked">货架位置</ion-label>
        <ion-input v-model="form.location" placeholder="如：A3-2" />
      </ion-item>
      <ion-item class="ion-margin-top">
        <ion-label position="stacked">商品描述 / 知识库</ion-label>
        <ion-textarea v-model="form.desc" :rows="3" placeholder="用途、安装/使用方法等，智购顾问会参考它回答顾客" />
      </ion-item>

      <div class="ion-margin-top">
        <ion-button expand="block" color="primary" @click="save" :disabled="saving">
          <ion-icon slot="start" :icon="saveIcon" />保存
        </ion-button>
        <ion-button v-if="!isNew" expand="block" fill="outline" color="danger" class="ion-margin-top" @click="remove">
          删除商品
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { onIonViewWillEnter } from '@ionic/vue';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonRow, IonCol, IonTextarea,
  IonButton, IonIcon } from '@ionic/vue';
import { save as saveIcon } from 'ionicons/icons';
import { showToast } from '@/composables/useToast';
import { ProductInput, Product } from '@/types';
import { findProduct, createProduct, updateProduct, deleteProduct } from '@/services/product.service';

const route = useRoute();
const router = useRouter();
const isNew = computed(() => route.params.id === 'new' || !route.params.id);
const saving = ref(false);
const categories = ['五金', '工具', '卫浴', '医药', '日用', '文具', '食品'];

const form = reactive<ProductInput>({
  name: '',
  barcode: '',
  category: '五金',
  buyPrice: 0,
  price: 0,
  stock: 0,
  safeStock: 0,
  location: '',
  desc: ''
});

const notify = showToast;

async function load() {
  if (isNew.value) return;
  const p = findProduct(route.params.id as string);
  if (!p) {
    await notify('商品不存在');
    router.back();
    return;
  }
  Object.assign(form, {
    name: p.name, barcode: p.barcode, category: p.category, buyPrice: p.buyPrice,
    price: p.price, stock: p.stock, safeStock: p.safeStock, location: p.location, desc: p.desc
  });
}

async function save() {
  if (!form.name.trim()) { await notify('请填写商品名称'); return; }
  const price = Number(form.price);
  if (!(price > 0)) { await notify('售价必须大于 0'); return; }
  saving.value = true;
  try {
    const input: ProductInput = {
      ...form,
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      location: form.location.trim(),
      desc: form.desc.trim(),
      buyPrice: Math.max(0, Number(form.buyPrice) || 0),
      price,
      stock: Math.max(0, Number(form.stock) || 0),
      safeStock: Math.max(0, Number(form.safeStock) || 0)
    };
    if (isNew.value) {
      await createProduct(input);
      await notify('已新增商品');
    } else {
      await updateProduct(route.params.id as string, input);
      await notify('已保存');
    }
    router.back();
  } finally {
    saving.value = false;
  }
}

async function remove() {
  await deleteProduct(route.params.id as string);
  await notify('已删除');
  router.back();
}

onIonViewWillEnter(load);
</script>
