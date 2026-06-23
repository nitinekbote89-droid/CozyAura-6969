import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  prefetch: false,
  adapter: node({
    mode: 'standalone'
  }),
  vite: {
    build: {
      modulePreload: {
        polyfill: false
      }
    }
  }
});
