import { ref } from 'vue';

export interface VoiceAlertOptions {
  rate?: number;
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof (window as any).SpeechSynthesisUtterance === 'function';
}

/**
 * Web Speech Synthesis 语音播报（商家端“低于安全库存语音提醒补货”）。
 * 浏览器不支持时静默降级，只保留界面提示。
 */
export function useVoiceAlert() {
  const supported = speechSynthesisSupported();
  const speaking = ref(false);
  const lastMessage = ref('');

  function speak(text: string, options: VoiceAlertOptions = {}): void {
    if (!supported || !text.trim()) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = options.rate ?? 1;
      utterance.onend = () => { speaking.value = false; };
      utterance.onerror = () => { speaking.value = false; };
      speaking.value = true;
      lastMessage.value = text;
      window.speechSynthesis.speak(utterance);
    } catch {
      speaking.value = false;
    }
  }

  function stop(): void {
    if (!supported) return;
    window.speechSynthesis.cancel();
    speaking.value = false;
  }

  return { supported, speaking, lastMessage, speak, stop };
}

/** 低库存补货提醒的标准话术，界面提示与语音播报共用 */
export function lowStockAlertText(name: string, stock: number, safeStock: number): string {
  return `提醒：「${name}」库存只剩 ${stock} 件，低于安全库存 ${safeStock} 件，请及时补货。`;
}
