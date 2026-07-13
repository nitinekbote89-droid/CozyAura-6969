import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import cloudflare from "@astrojs/cloudflare";
import sitemap from '@astrojs/sitemap';

const adapter = process.env.NETLIFY === 'true'
  ? netlify()
  : cloudflare();

export default defineConfig({
  site: 'https://cozyaura-6969.nitinekbote89.workers.dev',
  output: 'server',
  prefetch: false,
  adapter: adapter,
  integrations: [sitemap()],
  vite: {
    build: {
      modulePreload: {
        polyfill: false
      }
    }
  }
});