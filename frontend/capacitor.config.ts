import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crm.app',
  appName: 'VisitSarva',
  webDir: 'build',
  server: {
    url: 'https://visitsarva.com',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
