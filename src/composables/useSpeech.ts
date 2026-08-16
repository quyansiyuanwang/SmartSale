import { ref, onUnmounted } from 'vue';

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/**
 * Web Speech API 封装（Chrome / Edge 可用，iOS Safari 不支持时 supported=false）。
 * 识别结束后通过 onFinal 回调返回最终文本。
 */
export function useSpeech(onFinal?: (text: string) => void) {
  const supported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const listening = ref(false);
  const transcript = ref('');
  let rec: SpeechRecognitionLike | null = null;
  let stoppedByUser = false;

  function getRec(): SpeechRecognitionLike | null {
    if (rec) return rec;
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return null;
    const r = new Ctor() as SpeechRecognitionLike;
    rec = r;
    r.lang = 'zh-CN';
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (e: any) => {
      let t = '';
      const results: any[] = e.results || [];
      for (let i = 0; i < results.length; i++) {
        const seg = results[i];
        if (seg && seg.isFinal) t += (seg[0] && seg[0].transcript) || '';
      }
      if (t) transcript.value = t;
    };
    r.onend = () => {
      listening.value = false;
      const t = transcript.value.trim();
      if (t && !stoppedByUser && onFinal) onFinal(t);
      stoppedByUser = false;
    };
    r.onerror = () => {
      listening.value = false;
      stoppedByUser = false;
    };
    return r;
  }

  function start() {
    const r = getRec();
    if (!r) return;
    stoppedByUser = false;
    transcript.value = '';
    try {
      r.start();
      listening.value = true;
    } catch {
      listening.value = false;
    }
  }

  function stop() {
    stoppedByUser = true;
    rec?.stop();
  }

  function reset() {
    transcript.value = '';
  }

  onUnmounted(() => {
    rec?.abort?.();
  });

  return { supported, listening, transcript, start, stop, reset };
}
