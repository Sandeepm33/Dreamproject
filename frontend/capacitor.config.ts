import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.managramam.app',
  appName: 'Managramam',
  webDir: 'public',
  server: {
    // url: 'https://managramam.onrender.com',
    url: 'https://master.dntbx1bea0aru.amplifyapp.com',
    cleartext: true
  }
};

export default config;
