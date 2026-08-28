import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lowStockAlertText, speechSynthesisSupported, useVoiceAlert } from './useVoiceAlert';

class FakeUtterance {
  lang = '';
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

describe('语音播报（补货提醒）', () => {
  const speak = vi.fn();
  const cancel = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    vi.stubGlobal('speechSynthesis', { speak, cancel });
    speak.mockClear();
    cancel.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('支持语音环境：播报中文提醒并可停止', () => {
    expect(speechSynthesisSupported()).toBe(true);
    const alert = useVoiceAlert();
    alert.speak('库存预警');
    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0][0] as FakeUtterance;
    expect(utterance).toBeInstanceOf(FakeUtterance);
    expect(utterance.lang).toBe('zh-CN');
    expect(utterance.text).toBe('库存预警');
    expect(alert.speaking.value).toBe(true);
    expect(alert.lastMessage.value).toBe('库存预警');

    alert.stop();
    expect(cancel).toHaveBeenCalled();
    expect(alert.speaking.value).toBe(false);
  });

  it('重复播报前会取消上一次播报', () => {
    const alert = useVoiceAlert();
    alert.speak('第一条');
    alert.speak('第二条');
    expect(cancel).toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(2);
    expect((speak.mock.calls[1][0] as FakeUtterance).text).toBe('第二条');
  });

  it('空文本不触发播报', () => {
    const alert = useVoiceAlert();
    alert.speak('   ');
    expect(speak).not.toHaveBeenCalled();
    expect(alert.speaking.value).toBe(false);
  });

  it('低库存话术包含商品名、当前库存与安全库存', () => {
    const text = lowStockAlertText('电工胶带', 2, 5);
    expect(text).toContain('电工胶带');
    expect(text).toContain('2');
    expect(text).toContain('5');
    expect(text).toContain('补货');
  });

  it('浏览器不支持语音时静默降级', () => {
    vi.unstubAllGlobals();
    const alert = useVoiceAlert();
    expect(alert.supported).toBe(false);
    expect(() => alert.speak('不应播报')).not.toThrow();
    expect(alert.speaking.value).toBe(false);
  });
});
