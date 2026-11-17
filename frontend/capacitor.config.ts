import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crm.app',
  appName: 'VisitSarva',
  webDir: 'build',
  server: {
    url: 'https://visitsarva-crm-new.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
