import { describe, expect, it } from 'vitest';
import { businessHours, isValidBusinessHours, splitBusinessHours, validateStoreProfile } from './store-profile-validation';

const profile = { name: '智售五金店', address: '宁波市镇海区新新路 18 号', phone: '13800000000', hours: '08:00-21:00', welcome: '欢迎咨询商品和安装方法。' };

describe('store profile validation', () => {
  it('formats and validates a business-hours range', () => {
    expect(businessHours('09:00', '18:30')).toBe('09:00-18:30');
    expect(splitBusinessHours('09:00-18:30')).toEqual({ openingTime: '09:00', closingTime: '18:30' });
    expect(isValidBusinessHours('09:00-18:30')).toBe(true);
  });

  it('rejects an invalid or reversed business-hours range', () => {
    expect(isValidBusinessHours('18:00-09:00')).toBe(false);
    expect(isValidBusinessHours('invalid')).toBe(false);
  });

  it('returns clear errors for invalid store fields', () => {
    const result = validateStoreProfile({ ...profile, name: ' ', address: 'x', phone: '123', hours: '21:00-08:00', welcome: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(5);
  });
});
