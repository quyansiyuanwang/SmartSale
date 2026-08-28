import { describe, expect, it } from 'vitest';
import { onboardingPending, onboardingSteps } from './onboarding.service';
import { defaultProfile } from './seed';

const fullProfile = { ...defaultProfile };

describe('开店引导', () => {
  it('资料缺失时标记未完成', () => {
    const steps = onboardingSteps({ ...fullProfile, address: '' }, 0, false);
    const profileStep = steps.find((s) => s.key === 'profile')!;
    expect(profileStep.done).toBe(false);
    expect(onboardingPending(steps)).toBe(true);
  });

  it('资料完整但无商品时，商品步骤给出批量导入提示', () => {
    const steps = onboardingSteps(fullProfile, 0, false);
    const productStep = steps.find((s) => s.key === 'products')!;
    expect(productStep.done).toBe(false);
    expect(productStep.label).toContain('第一个商品');
    expect(productStep.hint).toContain('批量导入');
  });

  it('已有商品时商品步骤视为完成并展示数量', () => {
    const steps = onboardingSteps(fullProfile, 5, false);
    const productStep = steps.find((s) => s.key === 'products')!;
    expect(productStep.done).toBe(true);
    expect(productStep.label).toContain('5');
    expect(onboardingPending(steps)).toBe(true);
  });

  it('全部完成后不再显示待办', () => {
    const steps = onboardingSteps(fullProfile, 3, true);
    expect(steps.every((s) => s.done)).toBe(true);
    expect(onboardingPending(steps)).toBe(false);
  });
});
