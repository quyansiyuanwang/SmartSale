import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { barcodeScannerSupported, useBarcodeScanner } from './useBarcodeScanner';

class FakeDetector {
  static calls = 0;
  constructor(public options?: { formats?: string[] }) {
    FakeDetector.calls += 1;
  }
  async detect() {
    return [{ rawValue: '6900000000028', format: 'ean_13' }];
  }
}

describe('相机扫码（BarcodeDetector）', () => {
  beforeEach(() => {
    FakeDetector.calls = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('环境不支持时写入错误并保持未扫描状态', async () => {
    expect(barcodeScannerSupported()).toBe(false);
    const scanner = useBarcodeScanner(vi.fn());
    const video = document.createElement('video');
    await scanner.start(video);
    expect(scanner.error.value).toContain('不支持相机扫码');
    expect(scanner.scanning.value).toBe(false);
  });

  it('支持环境：打开相机并识别到条码后回调并停止', async () => {
    const stopTrack = vi.fn();
    class DelayedDetector {
      calls = 0;
      async detect() {
        this.calls += 1;
        return this.calls === 1 ? [] : [{ rawValue: '6900000000028', format: 'ean_13' }];
      }
    }
    vi.stubGlobal('BarcodeDetector', DelayedDetector);
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] }))
      }
    });
    expect(barcodeScannerSupported()).toBe(true);

    const onDetected = vi.fn();
    const scanner = useBarcodeScanner(onDetected);
    const video = document.createElement('video');
    await scanner.start(video);
    expect(scanner.error.value).toBeNull();
    expect(scanner.scanning.value).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(onDetected).toHaveBeenCalledWith('6900000000028');
    expect(scanner.scanning.value).toBe(false);
    expect(stopTrack).toHaveBeenCalled();
  });

  it('相机权限被拒绝时提示检查权限', async () => {
    vi.stubGlobal('BarcodeDetector', FakeDetector);
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn(async () => {
          throw new Error('NotAllowedError');
        })
      }
    });
    const scanner = useBarcodeScanner(vi.fn());
    await scanner.start(document.createElement('video'));
    expect(scanner.error.value).toContain('无法访问相机');
    expect(scanner.scanning.value).toBe(false);
  });

  it('手动 stop 会释放相机轨道', async () => {
    const stopTrack = vi.fn();
    vi.stubGlobal('BarcodeDetector', FakeDetector);
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] }))
      }
    });
    class IdleDetector extends FakeDetector {
      async detect() {
        return [];
      }
    }
    vi.stubGlobal('BarcodeDetector', IdleDetector);
    const scanner = useBarcodeScanner(vi.fn());
    await scanner.start(document.createElement('video'));
    expect(scanner.scanning.value).toBe(true);
    scanner.stop();
    expect(scanner.scanning.value).toBe(false);
    expect(stopTrack).toHaveBeenCalled();
  });
});
