import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartsale.app',
  appName: '智售引擎',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
