import { onUnmounted, ref } from 'vue';

export interface DetectedBarcode {
  rawValue: string;
  format?: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

export const SCAN_FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'qr_code'];

/** 浏览器原生扫码能力（Chrome/Edge 的 BarcodeDetector + 相机），无需扫码枪或原生插件 */
export function barcodeScannerSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const hasDetector = 'BarcodeDetector' in window;
  const hasCamera = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  return hasDetector && hasCamera;
}

/**
 * 相机扫码状态机：start 后循环检测，识别到条码回调 onDetected 并自动停止。
 * 不支持/无权限时只写 error，由界面提示降级为手动输入。
 */
export function useBarcodeScanner(onDetected: (value: string) => void) {
  const scanning = ref(false);
  const error = ref<string | null>(null);
  let detector: BarcodeDetectorLike | null = null;
  let stream: MediaStream | null = null;
  let videoEl: HTMLVideoElement | null = null;
  let cancelled = false;

  async function start(video: HTMLVideoElement): Promise<void> {
    if (scanning.value) return;
    if (!barcodeScannerSupported()) {
      error.value = '当前浏览器不支持相机扫码，请手动输入条码';
      return;
    }
    cancelled = false;
    error.value = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch {
      error.value = '无法访问相机，请检查权限后重试';
      return;
    }
    videoEl = video;
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    video.muted = true;
    try { await video.play(); } catch { /* 自动播放被拦截时继续静态检测 */ }
    const Ctor = (window as any).BarcodeDetector as new (options?: { formats?: string[] }) => BarcodeDetectorLike;
    try {
      detector = new Ctor({ formats: SCAN_FORMATS });
    } catch {
      detector = new Ctor();
    }
    scanning.value = true;
    void detectLoop();
  }

  async function detectLoop(): Promise<void> {
    while (!cancelled && scanning.value && videoEl && detector) {
      try {
        const codes = await detector.detect(videoEl);
        const hit = codes.find((code) => code.rawValue?.trim());
        if (hit) {
          const value = hit.rawValue.trim();
          stop();
          onDetected(value);
          return;
        }
      } catch { /* 单帧解码失败可忽略，继续下一帧 */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  function stop(): void {
    cancelled = true;
    scanning.value = false;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl = null;
    }
    detector = null;
  }

  onUnmounted(stop);

  return { scanning, error, start, stop };
}
