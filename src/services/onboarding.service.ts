import { StoreProfile } from '@/types';

export interface OnboardingStep {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  link: string;
}

/**
 * 商家开店引导：按门店当前状态给出下一步。
 * 全部完成时界面隐藏清单，不打扰老店主。
 */
export function onboardingSteps(profile: StoreProfile, productCount: number, hasSales: boolean): OnboardingStep[] {
  return [
    {
      key: 'profile',
      label: '完善门店资料',
      hint: '店名、地址与营业时间会显示在顾客扫码页',
      done: Boolean(profile.name?.trim() && profile.address?.trim() && profile.hours?.trim()),
      link: '/settings'
    },
    {
      key: 'products',
      label: productCount > 0 ? `已录入 ${productCount} 个商品` : '录入第一个商品',
      hint: productCount > 0 ? '可继续添加新商品，或用模板批量导入' : '手动添加，或下载 CSV 模板批量导入',
      done: productCount > 0,
      link: '/tabs/products'
    },
    {
      key: 'sales',
      label: hasSales ? '继续录入销售' : '录入第一笔销售',
      hint: '输入条码、扫码或搜索商品即可，库存会自动扣减',
      done: hasSales,
      link: '/tabs/sales'
    }
  ];
}

export function onboardingPending(steps: OnboardingStep[]): boolean {
  return steps.some((step) => !step.done);
}
