import { computed, onUnmounted, ref } from 'vue';

type SpeechState = 'idle' | 'starting' | 'listening' | 'stopping' | 'error';
interface SpeechRecognitionLike { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: any) => void) | null; onend: (() => void) | null; onerror: ((event: any) => void) | null; start(): void; stop(): void; abort(): void; }

/** Web Speech API state machine. `stop` means cancel; only natural completion invokes onFinal. */
export function useSpeech(onFinal?: (text: string) => void) {
  const supported = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const state = ref<SpeechState>('idle'); const transcript = ref(''); const error = ref<string | null>(null);
  const listening = computed(() => state.value === 'starting' || state.value === 'listening' || state.value === 'stopping');
  const isError = computed(() => state.value === 'error');
  let recognition: SpeechRecognitionLike | null = null; let activeToken = 0; let cancelledToken = 0;

  function start() {
    if (!supported || listening.value) return; const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!Ctor) return;
    const token = ++activeToken; transcript.value = ''; error.value = null; state.value = 'starting'; let finalTranscript = '';
    const rec = new Ctor() as SpeechRecognitionLike; recognition = rec; rec.lang = 'zh-CN'; rec.continuous = false; rec.interimResults = true;
    rec.onresult = (event: any) => { if (token !== activeToken || token === cancelledToken) return; let interimText = ''; for (let index = event.resultIndex ?? 0; index < (event.results?.length ?? 0); index += 1) { const result = event.results[index]; const text = result?.[0]?.transcript ?? ''; if (result?.isFinal) finalTranscript += text; else interimText += text; } transcript.value = `${finalTranscript}${interimText}`.trim(); state.value = 'listening'; };
    rec.onerror = (event: any) => { if (token !== activeToken || token === cancelledToken || event?.error === 'aborted') return; error.value = event?.error === 'not-allowed' ? '麦克风权限未开启' : '语音识别失败，请重试'; state.value = 'error'; };
    rec.onend = () => { if (token !== activeToken) return; recognition = null; const naturallyCompleted = token !== cancelledToken && state.value !== 'error'; const text = finalTranscript.trim(); if (naturallyCompleted) state.value = 'idle'; if (naturallyCompleted && text) onFinal?.(text); };
    try { rec.start(); state.value = 'listening'; } catch { if (token === activeToken) { error.value = '无法开始语音识别，请重试'; state.value = 'error'; } }
  }
  function stop() { if (!recognition || !listening.value) { state.value = 'idle'; return; } cancelledToken = activeToken; state.value = 'idle'; transcript.value = ''; recognition.abort(); recognition = null; }
  function reset() { transcript.value = ''; error.value = null; if (state.value === 'error') state.value = 'idle'; }
  onUnmounted(() => { cancelledToken = activeToken; activeToken += 1; recognition?.abort(); recognition = null; });
  return { supported, state, listening, isError, transcript, error, start, stop, reset };
}
