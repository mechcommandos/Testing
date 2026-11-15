import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.layjou.blocks',
  appName: 'LayJou Blocks',
  webDir: 'dist',
  backgroundColor: '#DFF7FAFF',
  android: {
    backgroundColor: '#DFF7FA',
  },
  ios: {
    backgroundColor: '#DFF7FA',
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0F9E77',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
