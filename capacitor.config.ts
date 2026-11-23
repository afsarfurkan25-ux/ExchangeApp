import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kurmatik.exchangeapp',
  appName: 'Kurmatik Exchange',
  webDir: 'dist',
  server: {
    url: 'https://exchange-app-alpha.vercel.app',
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
