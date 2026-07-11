import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server',
  prefetch: false,
  adapter: netlify(),
  vite: {
    build: {
      modulePreload: {
        polyfill: false
      }
    }
  }
});
