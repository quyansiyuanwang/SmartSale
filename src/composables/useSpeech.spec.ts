import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { useSpeech } from './useSpeech';

class MockRecognition {
  static latest: MockRecognition | null = null;
  lang = ''; continuous = false; interimResults = false;
  onresult: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  start() { MockRecognition.latest = this; }
  stop() { this.onend?.(); }
  abort() { this.onend?.(); }
  result(text: string, isFinal = true) { this.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript: text } }] }); }
  end() { this.onend?.(); }
}

describe('useSpeech', () => {
  it('cancels immediately and never submits a cancelled session', () => {
    (window as any).SpeechRecognition = MockRecognition; const onFinal = vi.fn(); let speech!: ReturnType<typeof useSpeech>; const wrapper = mount(defineComponent({ setup: () => { speech = useSpeech(onFinal); return () => h('div'); } }));
    speech.start(); MockRecognition.latest?.result('取消的内容'); speech.stop();
    expect(speech.listening.value).toBe(false); expect(speech.transcript.value).toBe(''); expect(onFinal).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('submits only when recognition ends naturally', () => {
    (window as any).SpeechRecognition = MockRecognition; const onFinal = vi.fn(); let speech!: ReturnType<typeof useSpeech>; const wrapper = mount(defineComponent({ setup: () => { speech = useSpeech(onFinal); return () => h('div'); } }));
    speech.start(); MockRecognition.latest?.result('自然结束'); MockRecognition.latest?.end();
    expect(speech.state.value).toBe('idle'); expect(onFinal).toHaveBeenCalledWith('自然结束');
    wrapper.unmount();
  });
});
