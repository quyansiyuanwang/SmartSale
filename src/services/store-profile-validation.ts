import type { StoreProfile } from '@/types';

export const DEFAULT_OPENING_TIME = '08:00';
export const DEFAULT_CLOSING_TIME = '21:00';
const BUSINESS_HOURS_PATTERN = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/;
const MOBILE_PHONE_PATTERN = /^1[3-9]\d{9}$/;
const LANDLINE_PHONE_PATTERN = /^0\d{2,3}-?\d{7,8}$/;

export interface StoreProfileValidation {
  valid: boolean;
  errors: string[];
  profile: StoreProfile;
}

function minutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

export function businessHours(openingTime: string, closingTime: string): string {
  return `${openingTime}-${closingTime}`;
}

export function splitBusinessHours(value: string): { openingTime: string; closingTime: string } {
  const match = BUSINESS_HOURS_PATTERN.exec(value);
  if (!match || minutes(`${match[1]}:${match[2]}`) === null || minutes(`${match[3]}:${match[4]}`) === null) {
    return { openingTime: DEFAULT_OPENING_TIME, closingTime: DEFAULT_CLOSING_TIME };
  }
  return { openingTime: `${match[1]}:${match[2]}`, closingTime: `${match[3]}:${match[4]}` };
}

export function isValidBusinessHours(value: string): boolean {
  const { openingTime, closingTime } = splitBusinessHours(value);
  const match = BUSINESS_HOURS_PATTERN.test(value);
  const opening = minutes(openingTime);
  const closing = minutes(closingTime);
  return match && opening !== null && closing !== null && closing > opening;
}

export function validateStoreProfile(input: StoreProfile): StoreProfileValidation {
  const profile: StoreProfile = {
    name: input.name.trim(),
    address: input.address.trim(),
    phone: input.phone.trim().replace(/\s+/g, ''),
    hours: input.hours.trim(),
    welcome: input.welcome.trim()
  };
  const errors: string[] = [];
  if (profile.name.length < 2 || profile.name.length > 120) errors.push('门店名称需为 2-120 个字符');
  if (profile.address.length < 2 || profile.address.length > 200) errors.push('门店地址需为 2-200 个字符');
  if (profile.phone && !MOBILE_PHONE_PATTERN.test(profile.phone) && !LANDLINE_PHONE_PATTERN.test(profile.phone)) errors.push('请输入有效的手机或座机号码');
  if (!isValidBusinessHours(profile.hours)) errors.push('请选择有效的营业时间，结束时间需晚于开始时间');
  if (!profile.welcome || profile.welcome.length > 300) errors.push('顾客欢迎语需为 1-300 个字符');
  return { valid: errors.length === 0, errors, profile };
}
